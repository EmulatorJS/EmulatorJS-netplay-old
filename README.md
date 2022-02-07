# emuserver

working netplay server for https://github.com/ethanaobrien/emulatorjs

**For a webserver:**

run `npm i` to init packages

and then `npm start` to start the server

edit the `config.json` to your liking

to start or stop the server, go to the root of the port or domain.

The username is `admin` and you can set the password in the config `passwordforserver` value.

````
{
    "defaultserverstate" : false,
    "passwordforserver" : "mypassword"
}
````

**For users with windows:**

go to the releases tab and download for the needed os


**For developers:**

run `cd electron` to go in the folder

then `npm i` to init packages

and then `npm start` to start the server

instructions on how to set up are in the readme [here](https://github.com/ethanaobrien/emulatorjs)

Bugs may exist - open an issue if you find one


# LICENSE

Licenced under the Apache License 2.0

Read the whole license [here](LICENSE)

