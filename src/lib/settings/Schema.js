const SchemaPiece = require('./SchemaPiece');
const { toTitleCase } = require('../util/util');
const fs = require('fs-nextra');

/**
 * The schema class that stores (nested) folders and keys for SettingGateway usage. This class also implements multiple helpers.
 */
class Schema {

	/**
	 * @typedef  {Object} AddOptions
	 * @property {string} type The type for the key.
	 * @property {*} [default] The default value for the key.
	 * @property {number} [min] The min value for the key (String.length for String, value for number).
	 * @property {number} [max] The max value for the key (String.length for String, value for number).
	 * @property {boolean} [array] Whether the key should be stored as Array or not.
	 * @property {string} [sql] The datatype of the key.
	 * @property {boolean} [configurable] Whether the key should be configurable by the config command or not.
	 * @memberof Schema
	 */

	/**
	 * @since 0.5.0
	 * @param {KlasaClient} client The client which initialized this instance.
	 * @param {(Gateway|GatewaySQL)} manager The Gateway that manages this schema instance.
	 * @param {Object} object The object containing the properties for this schema instance.
	 * @param {?Schema} parent The parent which holds this instance.
	 * @param {string} key The name of this key.
	 */
	constructor(client, manager, object, parent, key) {
		/**
		 * The Klasa client.
		 * @since 0.5.0
		 * @type {KlasaClient}
		 * @name Schema#client
		 * @readonly
		 */
		Object.defineProperty(this, 'client', { value: client });

		/**
		 * The Gateway that manages this schema instance.
		 * @since 0.5.0
		 * @type {(Gateway|GatewaySQL)}
		 * @name Schema#manager
		 * @readonly
		 */
		Object.defineProperty(this, 'manager', { value: manager });

		/**
		 * The Schema instance that is parent of this instance.
		 * @since 0.5.0
		 * @type {?Schema}
		 * @name Schema#parent
		 * @readonly
		 */
		Object.defineProperty(this, 'parent', { value: parent });

		/**
		 * The path of this schema instance.
		 * @since 0.5.0
		 * @type {string}
		 * @name Schema#path
		 * @readonly
		 */
		Object.defineProperty(this, 'path', { value: `${parent && parent.path.length > 0 ? `${parent.path}.` : ''}${key}` });

		/**
		 * The name of this schema instance.
		 * @since 0.5.0
		 * @type {string}
		 * @name Schema#key
		 * @readonly
		 */
		Object.defineProperty(this, 'key', { value: key });

		/**
		 * The type of this schema instance.
		 * @since 0.5.0
		 * @type {'Folder'}
		 * @name Schema#type
		 * @readonly
		 */
		Object.defineProperty(this, 'type', { value: 'Folder' });

		/**
		 * The default values for this schema instance and children.
		 * @since 0.5.0
		 * @type {Object}
		 * @name Schema#defaults
		 */
		Object.defineProperty(this, 'defaults', { value: {}, writable: true });

		/**
		 * A Set containing all keys' names which value is either a Schema or a SchemaPiece instance.
		 * @since 0.5.0
		 * @type {Set<string>}
		 * @name Schema#keys
		 */
		Object.defineProperty(this, 'keys', { value: new Set(), writable: true });

		/**
		 * A pre-processed array with all keys' names.
		 * @since 0.5.0
		 * @type {string[]}
		 * @name Schema#keyArray
		 */
		Object.defineProperty(this, 'keyArray', { value: [], writable: true });

		this._patch(object);
	}

	/**
	 * Get all configureable keys from this schema.
	 * @since 0.5.0
	 * @readonly
	 * @returns {string[]}
	 */
	get configurableKeys() {
		if (this.keyArray.length === 0) return [];
		return this.keyArray.filter(key => this[key].type === 'Folder' || this[key].configurable);
	}

	/**
	 * Create a new nested folder.
	 * @since 0.5.0
	 * @param {string} key The name's key for the folder.
	 * @param {Object} [object={}] An object containing all the Schema/SchemaPieces literals for this folder.
	 * @param {boolean} [force=true] Whether this function call should modify all entries from the database.
	 * @returns {Promise<Schema>}
	 */
	async addFolder(key, object = {}, force = true) {
		if (this.hasKey(key)) throw `The key ${key} already exists in the current schema.`;
		if (typeof this[key] !== 'undefined') throw `The key ${key} conflicts with a property of Schema.`;

		const folder = this._addKey(key, object, Schema);
		await fs.outputJSONAtomic(this.manager.filePath, this.manager.schema.toJSON());

		if (this.manager.sql) {
			if (folder.keyArray.length > 0) {
				if (typeof this.manager.provider.addColumn === 'function') await this.manager.provider.addColumn(this.manager.type, folder.getSQL());
				else throw new Error('The method \'addColumn\' in your provider is required in order to add new columns.');
			}
		} else if (force) {
			await this.force('add', key, folder);
		}
		return this.manager.schema;
	}

	/**
	 * Remove a nested folder.
	 * @since 0.5.0
	 * @param {string} key The folder's name to remove.
	 * @param {boolean} [force=true] Whether this function call should modify all entries from the database.
	 * @returns {Promise<Schema>}
	 */
	async removeFolder(key, force = true) {
		if (this.hasKey(key) === false) throw new Error(`The key ${key} does not exist in the current schema.`);
		if (this[key].type !== 'Folder') throw new Error(`The key ${key} is not Folder type.`);

		const folder = this[key];
		this._removeKey(key);
		await fs.outputJSONAtomic(this.manager.filePath, this.manager.schema.toJSON());

		if (this.manager.sql) {
			if (folder.keyArray.length > 0) {
				if (typeof this.manager.provider.removeColumn === 'function') await this.manager.provider.removeColumn(this.manager.type, folder.getKeys());
				else throw new Error('The method \'removeColumn\' in your provider is required in order to remove columns.');
			}
		} else if (force) {
			await this.force('delete', key, folder);
		}
		return this.manager.schema;
	}

	/**
	 * Check if the key exists in this folder.
	 * @since 0.5.0
	 * @param {string} key The key to check.
	 * @returns {boolean}
	 */
	hasKey(key) {
		return this.keys.has(key);
	}

	/**
	 * Add a new key to this folder.
	 * @since 0.5.0
	 * @param {string} key The name for the key.
	 * @param {AddOptions} options The key's options to apply.
	 * @param {boolean} [force=true] Whether this function call should modify all entries from the database.
	 * @returns {Promise<Schema>}
	 */
	async addKey(key, options, force = true) {
		if (this.hasKey(key)) throw `The key ${key} already exists in the current schema.`;
		if (typeof this[key] !== 'undefined') throw `The key ${key} conflicts with a property of Schema.`;
		if (!options) throw 'You must pass an options argument to this method.';
		if (typeof options.type !== 'string') throw 'The option type is required and must be a string.';
		options.type = options.type.toLowerCase();
		if (this.client.gateways.types.includes(options.type) === false) throw `The type ${options.type} is not supported.`;
		if (typeof options.min !== 'undefined' && isNaN(options.min)) throw 'The option min must be a number.';
		if (typeof options.max !== 'undefined' && isNaN(options.max)) throw 'The option max must be a number.';
		if (typeof options.array !== 'undefined' && typeof options.array !== 'boolean') throw 'The option array must be a boolean.';
		if (typeof options.configurable !== 'undefined' && typeof options.configurable !== 'boolean') throw 'The option configurable must be a boolean.';

		if (options.array === true) {
			if (typeof options.default === 'undefined') options.default = [];
			else if (Array.isArray(options.default) === false) throw 'The option default must be an array if the array option is set to true.';
		} else {
			if (typeof options.default === 'undefined') options.default = options.type === 'boolean' ? false : null;
			options.array = false;
		}
		this._addKey(key, options, SchemaPiece);
		await fs.outputJSONAtomic(this.manager.filePath, this.manager.schema.toJSON());

		if (this.manager.sql) {
			if (typeof this.manager.provider.addColumn === 'function') await this.manager.provider.addColumn(this.manager.type, key, this[key].sql[1]);
			else throw new Error('The method \'addColumn\' in your provider is required in order to add new columns.');
		} else if (force) {
			await this.force('add', key, this[key]);
		}
		return this.manager.schema;
	}

	/**
	 * Add a key to the instance.
	 * @since 0.5.0
	 * @param {string} key The name of the key.
	 * @param {AddOptions} options The options of the key.
	 * @param {(Schema|SchemaPiece)} Piece The class to create.
	 * @returns {(Schema|SchemaPiece)}
	 * @private
	 */
	_addKey(key, options, Piece) {
		if (this.hasKey(key)) throw new Error(`The key '${key}' already exists.`);
		const piece = new Piece(this.client, this.manager, options, this, key);
		this[key] = piece;
		this.defaults[key] = piece.type === 'Folder' ? piece.defaults : options.default;

		this.keys.add(key);
		this.keyArray.push(key);
		this.keyArray.sort((a, b) => a.localeCompare(b));

		return piece;
	}

	/**
	 * Remove a key from this folder.
	 * @since 0.5.0
	 * @param {string} key The key's name to remove.
	 * @param {boolean} [force=true] Whether this function call should modify all entries from the database.
	 * @returns {Promise<Schema>}
	 */
	async removeKey(key, force = true) {
		if (this.hasKey(key) === false) throw `The key ${key} does not exist in the current schema.`;
		const schemaPiece = this[key];
		this._removeKey(key);
		await fs.outputJSONAtomic(this.manager.filePath, this.manager.schema.toJSON());

		if (this.manager.sql) {
			if (typeof this.manager.provider.removeColumn === 'function') await this.manager.provider.removeColumn(this.manager.type, key);
			else throw new Error('The method \'removeColumn\' in your provider is required in order to remove columns.');
		} else if (force) {
			await this.force('delete', key, schemaPiece);
		}
		return this.manager.schema;
	}

	/**
	 * Remove a key from the instance.
	 * @since 0.5.0
	 * @param {string} key The name of the key.
	 * @private
	 */
	_removeKey(key) {
		const index = this.keyArray.indexOf(key);
		if (index === -1) throw new Error(`The key '${key}' does not exist.`);

		this.keys.delete(key);
		this.keyArray.splice(index, 1);
		delete this[key];
		delete this.defaults[key];
	}

	/**
	 * Modifies all entries from the database.
	 * @since 0.5.0
	 * @param {('add'|'edit'|'delete')} action The action to perform.
	 * @param {string} key The key.
	 * @param {(SchemaPiece|Schema)} piece The SchemaPiece instance to handle.
	 * @returns {Promise<*>}
	 * @private
	 */
	force(action, key, piece) {
		if (!(piece instanceof SchemaPiece) && !(piece instanceof Schema)) throw new TypeError(`'schemaPiece' must be an instance of 'SchemaPiece' or an instance of 'Schema'.`);

		const values = this.manager.cache.getValues(this.manager.type);
		const path = piece.path.split('.');

		if (action === 'add' || action === 'edit') {
			const defValue = this.defaults[key];
			for (let i = 0; i < values.length; i++) {
				let value = values[i];
				for (let j = 0; j < path.length - 1; j++) value = value[path[j]];
				value[path[path.length - 1]] = defValue;
			}
			return this.manager.provider.updateValue(this.manager.type, piece.path, defValue, this.manager.options.nice);
		}

		if (action === 'delete') {
			for (let i = 0; i < values.length; i++) {
				let value = values[i];
				for (let j = 0; j < path.length - 1; j++) value = value[path[j]];
				delete value[path[path.length - 1]];
			}
			return this.manager.provider.removeValue(this.manager.type, piece.path, this.manager.options.nice);
		}

		throw new TypeError(`Action must be either 'add' or 'delete'. Got: ${action}`);
	}

	/**
	 * Get a list.
	 * @since 0.5.0
	 * @param {KlasaMessage} msg The Message instance.
	 * @returns {string}
	 */
	getList(msg) {
		const array = [];
		const folders = [];
		const keys = {};
		let longest = 0;
		for (const key of this.keyArray) {
			if (this[key].type === 'Folder') {
				folders.push(`// ${key}`);
			} else if (this[key].configurable) {
				if (!(this[key].type in keys)) keys[this[key].type] = [];
				if (key.length > longest) longest = key.length;
				keys[this[key].type].push(key);
			}
		}
		const keysTypes = Object.keys(keys);
		if (folders.length === 0 && keysTypes.length === 0) return '';
		if (folders.length) array.push('= Folders =', ...folders.sort(), '');
		if (keysTypes.length) {
			for (const keyType of keysTypes.sort()) {
				keys[keyType].sort();
				array.push(`= ${toTitleCase(keyType)}s =`);
				for (let i = 0; i < keys[keyType].length; i++) array.push(`${keys[keyType][i].padEnd(longest)} :: ${this[keys[keyType][i]].resolveString(msg)}`);
				array.push('');
			}
		}
		return array.join('\n');
	}

	/**
	 * Get a JSON object with all the default values.
	 * @since 0.5.0
	 * @param {Object} [object={}] The object to update.
	 * @returns {Object}
	 */
	getDefaults(object = {}) {
		for (let i = 0; i < this.keyArray.length; i++) {
			const key = this.keyArray[i];
			if (key.type === 'Folder') object[key] = key.getDefaults(object[key]);
			else if (this[key].array && Array.isArray(this[key].default)) object[key] = this[key].default.slice(0);
			else object[key] = this[key].default;
		}
		return object;
	}

	/**
	 * Get all the SQL schemas from this schema's children.
	 * @since 0.5.0
	 * @param {string[]} [array=[]] The array to push.
	 * @returns {string[]}
	 */
	getSQL(array = []) {
		for (const key of this.keyArray) {
			if (this[key].type === 'Folder') this[key].getSQL(array);
			else array.push(this[key].sql);
		}
		return array;
	}

	/**
	 * Get all the pathes from this schema's children.
	 * @since 0.5.0
	 * @param {string[]} [array=[]] The array to push.
	 * @returns {string[]}
	 */
	getKeys(array = []) {
		for (const key of this.keyArray) {
			if (this[key].type === 'Folder') this[key].getKeys(array);
			else array.push(this[key].path);
		}
		return array;
	}

	/**
	 * Get all the SchemaPieces instances from this schema's children. Used for GatewaySQL.
	 * @since 0.5.0
	 * @param {string[]} [array=[]] The array to push.
	 * @returns {SchemaPiece[]}
	 */
	getValues(array = []) {
		for (const key of this.keyArray) {
			if (this[key].type === 'Folder') this[key].getValues(array);
			else array.push(this[key]);
		}
		return array;
	}

	/**
	 * @since 0.5.0
	 * @returns {string}
	 */
	resolveString() {
		return this.toString();
	}

	/**
	 * Method called in initialization to populate the instance with the keys from the schema.
	 * @since 0.5.0
	 * @param {Object} object The object to parse. Only called once per initialization.
	 * @private
	 */
	_patch(object) {
		for (const key of Object.keys(object)) {
			if (typeof object[key] !== 'object') continue;
			// Force retrocompatibility with SGv1's schema
			if (typeof object[key].type === 'undefined') object[key].type = 'Folder';
			if (object[key].type === 'Folder') {
				const folder = new Schema(this.client, this.manager, object[key], this, key);
				this[key] = folder;
				this.defaults[key] = folder.defaults;
			} else {
				const piece = new SchemaPiece(this.client, this.manager, object[key], this, key);
				this[key] = piece;
				this.defaults[key] = piece.default;
			}
			this.keys.add(key);
			this.keyArray.push(key);
		}
		this.keyArray.sort((a, b) => a.localeCompare(b));
	}

	/**
	 * Get a JSON object containing all the objects from this schema's children.
	 * @since 0.5.0
	 * @returns {Object}
	 */
	toJSON() {
		return Object.assign({ type: 'Folder' }, ...this.keyArray.map(key => ({ [key]: this[key].toJSON() })));
	}

	/**
	 * @since 0.5.0
	 * @returns {string}
	 */
	toString() {
		return this.configurableKeys.length !== 0 ? '{ Folder }' : '{ Empty Folder }';
	}

}

module.exports = Schema;
