# env0 Extension for Visual Studio Code


The env0 Extension for Visual Studio Code (VS Code) lets you interact with your env0 project form your IDE!

## Features

* automatically filters environments that are associated with the branch you're currently working on
* deploy, destroy, cancel, abort environments
* get notifications about environments' changing statuses, and when waiting for approval
* get live deployment log field in your VS Code terminal

## Requirements

You need to have a pre-existing env0 organization, and provide an api-key in your *DEBUGGING* VS Code's settings:  
go to settings (default shortcut CMD+,)  
and set both - api key id, and api secret key  
and you're done

## Development Workflow
1. clone this repo
2. `pnpm install`
3. go to the debug panel on the left side (CMD+SHFT+D)
4. on the `RUN AND DEBUG` select-box, choose `Run Extension`
5. if there's a dialog with a warning, click on `Debug Anyway`

By now, a new VS Code window should open up.  
This is the window where you'll interact with your extension.  
Whilst in the new window, open a git repo, which has any env0 environment associated with it  

*Note:* You will only see environments, in the organization of which you provided the api-keys   

That's it! any changes you make here would appear in the new window after you re-open / re-load the debug window (see below)

## Some Tips
instead of closing your debug window and reopening, hit:
1. CMD+SHIFT+P
2. search `reload`
3. hit enter

*Note* - some changes require to fully close the Debugging IDE (we've mainly encountered that when adding icons and such)

Checking out the reading sources below is highly recommended

## Extension Settings

This extension contributes the following settings:

* `env0.apiKeyId`
* `env0.secretKey`

## For more information

* [Visual Studio Code's Extension Development Guide](https://code.visualstudio.com/api/extension-guides/overview)
* [Visual Studio Code's Extension Development UX Guideline](https://code.visualstudio.com/api/ux-guidelines/overview)

**Enjoy!**
