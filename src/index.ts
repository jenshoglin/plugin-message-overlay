import type {Button} from '@pexip/plugin-api';
import {registerPlugin} from '@pexip/plugin-api';

interface GetMessageResponseData {
    result: {text: string};
}

const plugin = await registerPlugin({
    id: 'messageOverlay',
    version: 0,
});

let currentMessage: string;
let button: Button<'settingsMenu'> | undefined = undefined;

const addButtonIfNotExists = async () => {
    if (button) {
        return; 
    }
    try {
        button = await plugin.ui.addButton({
            position: 'settingsMenu',
            label: 'Message Overlay',
            inMeetingOnly: true,
            roles: ['chair'],
        });
        button.onClick.add(async () => {
            const message =
                'Write your message overlay text below. If you would like to get a new line press enter or make a new line in the textarea';

            const getMessage = await plugin.conference.sendRequest({
                method: 'GET',
                path: 'get_message_text',
            });
            const responseData = getMessage?.data as GetMessageResponseData;
            currentMessage = responseData.result.text;

            const form = await plugin.ui.addForm({
                title: 'Set message overlay',
                description: message,
                form: {
                    elements: {
                        setMessage: {
                            name: 'Enter text',
                            type: 'textarea',
                            isOptional: true,
                            placeholder: 'Enter your message',
                            value: currentMessage,
                        },
                    },
                    submitBtnTitle: 'Submit',
                },
            });
            form.onInput.add(async result => {
                void form.remove();
                if (result.setMessage || result.setMessage == '') {
                    const payload = {
                        text: result.setMessage,
                    };
                    await plugin.conference.sendRequest({
                        method: 'POST',
                        path: 'set_message_text',
                        payload: payload,
                    });
                }
            });
        });
    } catch (e) {
        console.warn(e);
    }
};

const cleanupButton = async () => {
    await button?.remove();
    button = undefined;
};
const removeButtonIfExists = async () => {
    if (button) {
        await cleanupButton();
    }
};

let conferenceStatusEventQueue: Promise<void> = Promise.resolve();
plugin.events.conferenceStatus.add(async ({id, status}) => {
    if (id !== 'main') {
        return;
    }
    await conferenceStatusEventQueue;
    conferenceStatusEventQueue = new Promise(resolve => {
        if (!status.directMedia && status.started) {
            void addButtonIfNotExists().then(() => resolve());
        } else {
            void removeButtonIfExists().then(() => resolve());
        }
    });
});