const Piece = require('./interfaces/Piece');

/**
 * Base class for all Klasa Events. See {@tutorial CreatingEvents} for more information how to use this class
 * to build custom events.
 * @tutorial CreatingEvents
 * @implements {Piece}
 */
class Event {

	/**
	 * @typedef {Object} EventOptions
	 * @memberof Event
	 * @property {string} [name = theFileName] The name of the event
	 * @property {boolean} [enabled=true] Whether the event is enabled or not
	 */

	/**
	 * @since 0.0.1
	 * @param {KlasaClient} client The klasa client
	 * @param {string} dir The path to the core or user event pieces folder
	 * @param {string} file The path from the pieces folder to the event file
	 * @param {EventOptions} [options={}] The Event options
	 */
	constructor(client, dir, file, options = {}) {
		/**
		 * @since 0.0.1
		 * @type {KlasaClient}
		 */
		this.client = client;

		/**
		 * The directory to where this event piece is stored
		 * @since 0.0.1
		 * @type {string}
		 */
		this.dir = dir;

		/**
		 * The file location where this event is stored
		 * @since 0.0.1
		 * @type {string}
		 */
		this.file = file;

		/**
		 * The name of the event
		 * @since 0.0.1
		 * @type {string}
		 */
		this.name = options.name || file.slice(0, -3);

		/**
		 * The type of Klasa piece this is
		 * @since 0.0.1
		 * @type {string}
		 */
		this.type = 'event';

		/**
		 * If the event is enabled or not
		 * @since 0.0.1
		 * @type {boolean}
		 */
		this.enabled = 'enabled' in options ? options.enabled : true;
	}

	/**
	 * A wrapper for the run method, to easily disable/enable events
	 * @since 0.0.1
	 * @param {*} param The event parameters emited
	 * @private
	 * @returns {void}
	 */
	_run(...args) {
		if (this.enabled) this.run(...args);
	}

	/**
	 * The run method to be overwritten in actual event handlers
	 * @since 0.0.1
	 * @param {*} param The event parameters emited
	 * @abstract
	 * @returns {void}
	 */
	run() {
		// Defined in extension Classes
	}

	/**
	 * The init method to be optionaly overwritten in actual events
	 * @since 0.0.1
	 * @abstract
	 * @returns {void}
	 */
	async init() {
		// Optionally defined in extension Classes
	}

	// left for documentation
	/* eslint-disable no-empty-function */
	async reload() {}
	unload() {}
	disable() {}
	enable() {}
	/* eslint-enable no-empty-function */

}

Piece.applyToClass(Event);

module.exports = Event;
