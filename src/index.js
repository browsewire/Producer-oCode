// var memwatch = require('@airbnb/node-memwatch')
// memwatch.on('leak', (info) => {
//     console.error('Memory leak detected:\n', info)
// })

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch(e) {
    console.log('dotenv not available, using existing environment variables');
}

const express = require('express');
const app = express();
const {
    processStoredCommand,
    isJson,
    addDisplayMessages,
} = require('./commands');
const {
    makeId,
    ports
} = require('./globals.js');
// const producer = require('./broker')

//this is a global variable, so not defined with let, const or var
global.displaymessages = []
global.export_status = {
    dn: {
        queued: [],
        running: [],
        complete: [],
        flushed: [],
        stopped: [],
    },
    tf: {
        queued: [],
        running: [],
        complete: [],
        flushed: [],
        stopped: [],
    },
    fa: {
        queued: [],
        running: [],
        complete: [],
        flushed: [],
        stopped: [],
    },
    tlx: {
        queued: [],
        running: [],
        complete: [],
        flushed: [],
        stopped: [],
    },
}
addDisplayMessages('Producer screen initialized.')

/* we are using pug template engine to render the producer landing page */
app.set('view engine', 'pug')

/* we are using the views directory for the pug template files */
app.set('views', './src/views')

/* for the base url we are handling get requests along with a query string */
app.get('/', async (req, res) => {
    // console.log('req.query', req.query)
    try {
        /*pass tasks from get query into the rabbit mq producer to send a signal to the apps */
        let i = 0
        /*
        the producer message is a key value string joined by
        ampersands (a url querystring basically) that we send to 
        the apps through rabbitmq, that string is parsed
        to allow us to pass arguments in addition to a command
        such as the export routes or export list
        */
        let producerMessage = ''

        //if this is a display message, just pop it right up
        if (req.query.displaymessage) {
            let config = {}
            let message = req.query.displaymessage
            if (typeof req.query.config != 'undefined') {
                if (
                    typeof req.query.config === 'string' &&
                    isJson(req.query.config)
                ) {
                    config = JSON.parse(req.query.config)
                } else {
                    config = req.query.config
                }
            }
            addDisplayMessages(message, config)
        }

        //the producer receives status updates from 
        //the wordpress cron job that checks
        //magento indexer and sale rules
        if (req.query.status) {
            if (isJson(req.query.status)) {
                const status = JSON.parse(req.query.status);
                // console.log('status', status);
                if (typeof status.time != 'undefined') {
                    let utcSeconds = status.time;
                    let d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                    d.setUTCSeconds(utcSeconds);
                    ports.status_time = d.toLocaleString('en-US', { timeZone: 'America/Chicago' });
                }
                if (typeof status.indexer_status != 'undefined') {
                    ports.indexer_status = status.indexer_status;
                }
                if (typeof status.active_sale_rules != 'undefined') {
                    ports.active_sale_rules = status.active_sale_rules
                }
            }
        }

        //if this is a task, check if it's parsable json or not,
        //if not then make it into a standard format json object
        if (req.query.task) {
            /*
            if a task is not json, it must be parsed into the format
            non json tasks are legacy tasks that go directly to rabbit mq
            these are like task=cleanelder--tf and task=exportelder&site=dn
            the non json commands are passed directly to the rabbitmq
            command to go to the apps, if they are export commands, a graphql flush
            is run first
            {
                siteId: 'dn',
                cmd: 'rabbitmq',
                key: 'rmq' + makeId(10),
                page: 1,
                totalPages: 1,
                data: ['/*'],
                ?stackKey: 'randStackKey'+ makeId(10)
                ?stackPage: 3
                ?stackTotalPages: 3
            }

            to run multiple commands in a row we can add 

            stackKey
            stackPage
            stackTotalPages

            for stacks
            multiple commands can be passed in a row and will be executed in stackPage
            order like 1 then 2 then 3 (they are sorted by page number and run from lowest to highest)
            note the actual page number is not checked, just used to sort
            processStoredCommands will wait until the number of items with matching stackKey 
            matches the number of stackTotalPages, then it will sort them by stackPage from
            lowest to highest and then execute them from lowest to highest

            for the regular key and stack key
            if processStoredCommand receives different stack keys for the same site id, it will
            reset the stack 
            the same is true for regular commands when processStoredCommands is trying to combine
            data from matching keys, if processStoredCommands received a different key for the same
            site id, it will reset the data it's been aggregating for the command
            */

            let generatedJsonTask
            if (!isJson(req.query.task)) {
                //export commands are just query strings like
                //?task=export&site=fa&list=&routes=home,blog
                //it can also look like
                //?task=export--fa
                generatedJsonTask = {
                    page: 1,
                    totalPages: 1,
                    data: [],
                    cmd: 'rabbitmq',
                    key: 'generatedJsonTask' + makeId(10),
                }
                for (arg in req.query) {
                    generatedJsonTask[arg] = req.query[arg]

                    if (i > 0) {
                        producerMessage += '&'
                    }

                    /*
                    when elder replaced sapper
                    here we turn export into exportelder
                    we maintain this in case BE or other devs
                    just send the export string
                    we may also see strings like export--dn
                    so we check to see if the site id is included in the task
                    argument
                    */
                    if (arg == 'task') {
                        let taskSite = req.query.task.split('--')
                        if (taskSite[0] == 'export') {
                            taskSite[0] = 'exportelder'
                        }
                        producerMessage += 'task=' + taskSite[0]
                        if (arg != 'task' && arg != 'displaymessage') {
                            producerMessage += arg + '=' + req.query[arg]
                        }
                        if (taskSite.length > 1) {
                            producerMessage += '&site=' + taskSite[1]
                            generatedJsonTask.siteId = taskSite[1]
                        }
                    } else {
                        if (Array.isArray(req.query[arg])) {
                            if (req.query[arg].length > 0) {
                                producerMessage +=
                                    arg + '=' + req.query[arg].join(',')
                            }
                        } else {
                            producerMessage += arg + '=' + req.query[arg]
                        }
                    }
                    i++
                }
                generatedJsonTask.producerMessage = producerMessage
            } else {
                generatedJsonTask = JSON.parse(req.query.task)
            }

            if (typeof generatedJsonTask.site != 'undefined') {
                generatedJsonTask.siteId = generatedJsonTask.site
            }
            if (
                typeof generatedJsonTask.task != 'undefined' &&
                generatedJsonTask.task == 'export'
            ) {
                generatedJsonTask.task = 'exportelder'
            }

            console.log(
                'generatedJsonTask logged in producer index js',
                generatedJsonTask
            )

            //if this is an export task, add some extra commands
            if (
                typeof generatedJsonTask.task != 'undefined' &&
                generatedJsonTask.task.indexOf('develder') != -1
            ) {
                /*
                create a stack of commands
                before an elder dev start up the container
                note the startup container script does not do anything
                in local environments
                */
                let stackKey = generatedJsonTask.siteId + 'stack' + makeId(10)

                //start up the container for dev, staging & prod
                processStoredCommand(
                    JSON.stringify({
                        siteId: generatedJsonTask.siteId,
                        cmd: 'container',
                        containerCmd: 'up',
                        key: 'keyContainer' + makeId(10),
                        page: 1,
                        totalPages: 1,
                        stackKey: stackKey,
                        stackPage: 1,
                        stackTotalPages: 2,
                        data: [],
                    })
                )

                //modify the current task to go onto the stack
                generatedJsonTask.stackKey = stackKey
                generatedJsonTask.stackPage = 2
                generatedJsonTask.stackTotalPages = 2
            }

            // Handle TLX build (not export)
            if (
                typeof generatedJsonTask.siteId != 'undefined' &&
                generatedJsonTask.siteId === 'tlx' &&
                typeof generatedJsonTask.task != 'undefined' &&
                generatedJsonTask.task.indexOf('export') != -1
            ) {
                // Convert export to buildLuxraytime command
                generatedJsonTask = {
                    siteId: 'luxraytime',
                    cmd: 'buildLuxraytime',
                    buildType: 'npm',
                    key: 'buildLux' + makeId(10),
                    page: 1,
                    totalPages: 1,
                    data: []
                }
                addDisplayMessages('Converting TLX export to Luxraytime build command')
            }
            
            //if this is an export task, add some extra commands
            if (
                typeof generatedJsonTask.task != 'undefined' &&
                generatedJsonTask.task.indexOf('export') != -1
            ) {
                /*
                create a stack of commands
                before an export start up the container
                note the startup container script does not do anything
                in local environments
                and flush the graphql cache
                */
                let stackKey = generatedJsonTask.siteId + 'stack' + makeId(10)

                //start up the container for dev, staging & prod
                processStoredCommand(
                    JSON.stringify({
                        siteId: generatedJsonTask.siteId,
                        cmd: 'container',
                        containerCmd: 'down',
                        key: 'keyContainerDown' + makeId(10),
                        page: 1,
                        totalPages: 1,
                        stackKey: stackKey,
                        stackPage: 1,
                        stackTotalPages: 4,
                        data: [],
                    })
                )

                //start up the container for dev, staging & prod
                processStoredCommand(
                    JSON.stringify({
                        siteId: generatedJsonTask.siteId,
                        cmd: 'container',
                        containerCmd: 'up',
                        key: 'keyContainer' + makeId(10),
                        page: 1,
                        totalPages: 1,
                        stackKey: stackKey,
                        stackPage: 2,
                        stackTotalPages: 4,
                        data: [],
                    })
                )

                //flush the varnish and aws cache before the export
                processStoredCommand(
                    JSON.stringify({
                        siteId: generatedJsonTask.siteId,
                        cmd: 'cacheclear',
                        key: 'keyapi' + makeId(10),
                        page: 1,
                        totalPages: 1,
                        stackKey: stackKey,
                        stackPage: 3,
                        stackTotalPages: 4,
                        data: ['/graphql*'],
                    })
                )

                //modify the current task to go onto the stack
                generatedJsonTask.stackKey = stackKey
                generatedJsonTask.stackPage = 4
                generatedJsonTask.stackTotalPages = 4
            }

            //run the command
            processStoredCommand(JSON.stringify(generatedJsonTask))
        }
        if (Object.keys(req.query).length != 0) {
            res.redirect('/')
        } else {
            res.render('index', {
                title: 'Producer Box',
                ports: ports,
                displaymessages: displaymessages,
            })
        }
    } catch (err) {
        console.log('index.js err', err)
    }
})

/* we are setting port 80 to listen with the express server */
app.listen(8080, () => {
    console.log('Producer landing page listening on port 8080')
})
