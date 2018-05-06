
require('dotenv').load();
const express = require('express');
const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();

const accountSid = process.env.TWI_ACCOUNT_ID;
const authToken = process.env.TWI_TOKEN;
const client = new twilio(accountSid, authToken);

const watsonUser = process.env.WATSON_USER;
const watsonPsw = process.env.WATSON_PSW;
const workspaceSid = process.env.WATSON_WRK_SPACE;

const conversation = new ConversationV1({
    username: watsonUser,
    password: watsonPsw,
    version_date: ConversationV1.VERSION_DATE_2016_09_20
});

app.use(bodyParser.urlencoded({
    extended: false
}));

let contexts = [];
app.get('/', (req, res) => {
    console.log('listo');
    res.end();

});

app.post('/voicebot', (req, res) => {
    const message = req.body.SpeechResult;
    const number = req.body.From;
    const twilioNumber = req.body.To;

    let context = null;
    let index = 0;
    let contextIndex = 0;

    const VoiceResponse = twilio.twiml.VoiceResponse;
    console.log('VoiceResponse');

    const response = new VoiceResponse();

    const gather = response.gather({
        input: 'speech',
        action: '/voicebot'
    });

    if (message) {

        contexts.forEach((value) => {
            if (value.from === number) {
                context = value.context;
                contextIndex = index;
            }
            index++;
        });

        conversation.message({
            input: {
                text: message
            },
            workspace_id: workspaceSid,
            context: context
        }, (err, wtResponse) => {
            if (err) {
                console.error(err);
            } else {
                const reply = wtResponse.output.text[0];

                if (context == null) {
                    contexts.push({
                        'from': number,
                        'context': wtResponse.context
                    });
                } else {
                    contexts[contextIndex].context = wtResponse.context;
                }

                let intent = wtResponse.intents[0].intent;
                console.log(intent);

                if (intent == 'done') {
                    context.splice(contextIndex, 1);
                    res.end(reply);
                }

                gather.say({voice: 'alice'}, reply);
                res.send(response.toString());
            }
        });
    } else {
        gather.say({voice: 'alice'}, 'Wellcome to the Careerbuilder voice platform, how can I help you?');
        res.send(response.toString());
    }
});

app.post('/twiliobot', (req, res) => {

    const message = req.body.Body;
    const number = req.body.From;
    const twilioNumber = req.body.To;

    let context = null;
    let index = 0;
    let contextIndex = 0;

    contexts.forEach((value) => {
        console.log(value.from);
        if (value.from === number) {
            context = value.context;
            contextIndex = index;
        }
        index++;
    });

    console.log(`Recieved message from ${number}  saying '${message}'`);

    conversation.message({
        input: {
            text: message
        },
        workspace_id: workspaceSid,
        context: context
    }, (err, response) => {
        if (err) {
            console.error(err);
        } else {
            console.log(response.output.text[0]);
            if (context == null) {
                contexts.push({
                    'from': number,
                    'context': response.context
                });
            } else {
                contexts[contextIndex].context = response.context;
            }

            let intent = response.intents[0].intent;
            console.log(intent);

            if (intent == 'done') {
                context.splice(contextIndex, 1);
            }
            client.messages.create({
                from: twilioNumber,
                to: number,
                body: response.output.text[0]
            }).then(message => {
                console.log(message.sid);
            }).done();
        }
    });

    res.send('');
    res.end();

});


app.listen(process.env.PORT_NUMBER, () => {
    console.log('server connected');
});