blablabla

- [Klasa CLient](#klasa-client)
  - [option 1](#option-1)
  - [option 2](#option-2)
  - [option 3](#option-3)
  - [option 4](#option-4)
  - [option 5](#option-5)
- [Permission levels](#permission-levels)

## Klasa CLient


<details open>
<summary>Terminal</summary>

{terminal/init img}

```bash
npm init
```

{terminal/package_json img}

```bash
npm i dirigeants/klasa hydrabolt/discord.js
```
{terminal/package\_json\_after_install img}
</details>

<details>
<summary>klasa-vscode</summary>

{klasa-vscode/init img}

You can use the command `Klasa: init a new bot` instead. You will have to manually edit the `package.json` file.
{klasa-vscode/package\_json\_after_install img}
</details>

Minimal code:  
File: `src/klasa.js`
```js
const { Client } = require('klasa');

new Client().login('PAST_YOUR_TOKEN_HERE');
```

> **TODO :** Replace `PAST_YOUR_TOKEN_HERE` with your own bot token.

To start your bot, go back in the terminal and write `node .`. This will also generate a bunch of empty folders (commands, monitors, ...)

> **Note :** Instead of using `node .`you could use a process manager like [pm2](http://pm2.keymetrics.io/)

{first_launch img}

You should be able to do `@BotName ping`

> **TODO :** Replace `BotName` the actual bot's name

{first_ping img}

explanation of client and it options (in detail)

### option 1
### option 2
### option 3
### option 4
### option 5

## Permission levels


---

Further reading:
---

- [Introduction]{@tutorial Introduction}
- [Klasa Structure]{@tutorial KlasaStructure}
- [Data handling]{@tutorial DataHandling}
- [Events]{@tutorial Events}
- [Inhibitors]{@tutorial Inhibitors}
- [Commands]{@tutorial Commands}
- [Finalizers]{@tutorial Finalizers}
- [Pro section]{@tutorial ProSection}