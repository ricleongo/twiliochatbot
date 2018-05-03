const express = require('express');
const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();

const accountSid = 'ACa814e21ee884e218f4364f7146fbb908';
const authToken = 'bb77b3444c25c7be0a863525972b1c2d';
const client = new twilio(accountSid, authToken);

const watsonUser = '83c10da5-17da-4d14-9d0b-ac3a73015727';
const watsonPsw = 'cJcEwc5MTwye';
const workspaceSid = '48816453-1ca6-4a1c-9463-3a20b67cecc0';

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
            // console.log(value.from);
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
                // console.log(reply);
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

    

    // response.say({ voice: 'alice' }, 'It is Sandy\'s fault');
    // res.writeHead(200, {
    //     'Content-Type': 'text/xml'
    // });
    //res.end(response.toString());
    // res.type('text/xml');
    // res.send(response.toString());

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

    console.log('Recieved message from ' + number + ' saying \'' + message + '\'');
    // console.log(JSON.stringify(context));
    // console.log(contexts.length);

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


app.listen(3000, () => {
    console.log('server connected');
});