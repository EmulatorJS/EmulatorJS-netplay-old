# EmulatorJS netplay server Old
*The new Netplay version will be available when the new emulatorjs vision 4.0 is released*

Working netplay server for https://github.com/emulatorjs/emulatorjs

**To use:**

Run `npm i` to install packages

And then `npm start` to start the server

Instructions on how to set up with emulatorjs are located [here](https://emulatorjs.org/docs4devs/Netplay.html)

Bugs may exist - open an issue if you find one


**Setting up twilio:**

This app requires you to sign up for a twilio account.

Don't worry, it's free, at least for as long as I've had it.

Open [their website](https://www.twilio.com/try-twilio) and sign up.



Once you have created an application, it will show you your "account info" on the screen

With the options of "Account SID", and "Auth Token".

Open `config.json` and copy and paste these values into the matching empty fields.

The netplay server will not start if you do not follow this step.

**Editing the password:**

The username is `admin` and you can set the password in the config `passwordforserver` value.

```json
{
    "passwordforserver" : "mypassword"
}
```


# LICENSE

Licenced under the Apache License 2.0

Read the whole license [here](LICENSE)
