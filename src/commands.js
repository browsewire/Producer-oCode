const fs = require('fs').promises
const path = require('path')
//https://stackoverflow.com/questions/30763496/how-to-promisify-nodes-child-process-exec-and-child-process-execfile-functions
const util = require('util')
/* promisify the exec function to run bash scripts async */
const exec = util.promisify(require('child_process').exec)
const MurmurHash3 = require('imurmurhash')
const producer = require('./broker')

/*
Distributions:
Develop: 
E1EDB6ZFCID4PF (all)
Staging: 
E391J2MGQ6ZBX3 (m2-staging.dn,tf,fa)
E3561NEQIBX1CU (All the rest of the hostnames)
Prod: 
E206DWJUE94NO9 (DN)
E1KDZBO4GSGPBK  (TF)
E2ICJXU4G8J547 (FA)
EFV1F0BF9CFH (-api)  
E1J71N7HEJQ45U (all the rest)
*/
//this is an object to store commands that get data from multiple requests
//such as a links array that might span multiple query objects
const storedCommands = {
    dn: {
        key: '',
        data: [],
        pages: 0,
    },
    tf: {
        key: '',
        data: [],
        pages: 0,
    },
    fa: {
        key: '',
        data: [],
        pages: 0,
    },
    api: {
        key: '',
        data: [],
        pages: 0,
    },
    other: {
        key: '',
        data: [],
        pages: 0,
    },
    stacks: {
        dn: {
            stackKey: '',
            commands: [],
        },
        tf: {
            stackKey: '',
            commands: [],
        },
        fa: {
            stackKey: '',
            commands: [],
        },
        api: {
            stackKey: '',
            commands: [],
        },
        other: {
            stackKey: '',
            commands: [],
        },
    },
}
const findWhichEnv = function () {
    let environment = 'local'
    if (process.env.MAG_NAME.indexOf('m2-dev') != -1) {
        environment = 'dev'
    }
    if (process.env.MAG_NAME.indexOf('stag') != -1) {
        environment = 'stage'
    }
    if (process.env.MAG_NAME.indexOf('www') != -1) {
        environment = 'prod'
    }
    return environment
}

const addDisplayMessages = function (messages) {
    //uses global displaymessages
    if (!Array.isArray(messages)) {
        messages = [messages]
    }
    //log them so we can see the messages in the logs too
    console.log('displayMessages', messages)
    for (let m = 0; m < messages.length; m++) {
        displaymessages.unshift(messages[m])
    }

    let arrLength = displaymessages.length
    let maxNumber = 300
    if (arrLength > maxNumber) {
        displaymessages.splice(0, arrLength - maxNumber)
    }
}
/*
Read a directory and sort the results by when they were last editted
*/
const readdirChronoSorted = async function (dirpath, order) {
    order = order || 1
    const files = await fs.readdir(dirpath)
    const stats = await Promise.all(
        files
            .filter(function (filename) {
                if (filename === '.gitkeep' || filename === 'inprogress') {
                    return false // skip
                }
                return true
            })
            .map((filename) => {
                return fs
                    .stat(path.join(dirpath, filename))
                    .then((stat) => ({ filename, stat }))
            })
    )
    return stats
        .sort(
            (a, b) => order * (b.stat.mtime.getTime() - a.stat.mtime.getTime())
        )
        .map((stat) => stat.filename)
}

const getLogDir = function () {
    return __dirname + '/logs/cache/'
}

const makeId = function (length) {
    var result = ''
    var characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for (var i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        )
    }
    return result
}

/*
Convert the time zone
*/
const convertTZ = function (date, tzString) {
    return new Date(
        (typeof date === 'string' ? new Date(date) : date).toLocaleString(
            'en-US',
            { timeZone: tzString }
        )
    )
}
const getTimeStamp = function () {
    let dateStr = new Date()
    dateStr = convertTZ(dateStr, 'America/Chicago')
    dateStr = dateStr.toLocaleString()
    return dateStr
}
const makeCacheKey = function (source, query, vars) {
    let hashState = MurmurHash3(source + query + JSON.stringify(vars))
    let hash = hashState.result()
    return hash
}

/*
Distribution IDs tell aws which cache to flush
*/
const awsDistributions = {
    dn: {
        dev: 'E1EDB6ZFCID4PF',
        stage: 'E391J2MGQ6ZBX3',
        prod: 'E206DWJUE94NO9',
    },
    tf: {
        dev: 'E1EDB6ZFCID4PF',
        stage: 'E391J2MGQ6ZBX3',
        prod: 'E1KDZBO4GSGPBK',
    },
    fa: {
        dev: 'E1EDB6ZFCID4PF',
        stage: 'E391J2MGQ6ZBX3',
        prod: 'E2ICJXU4G8J547',
    },
    api: {
        dev: 'E1EDB6ZFCID4PF',
        stage: 'E3561NEQIBX1CU',
        prod: 'EFV1F0BF9CFH',
    },
    other: {
        dev: 'E1EDB6ZFCID4PF',
        stage: 'E3561NEQIBX1CU',
        prod: 'E1J71N7HEJQ45U',
    },
}

/*
Execute a bash function asynchronously then return the 
messages
*/
const execFunction = async function (execString) {
    let messages = []
    try {
        let { stdout, stderr, error } = await exec(execString)
        if (error) {
            messages.push(`error: ${error.message}`)
        }
        if (stderr) {
            messages.push(`stderr: ${stderr}`)
        }
        messages.push(`stdout: ${stdout}`)
        return {
            error,
            stderr,
            stdout,
            messages,
        }
    } catch (err) {
        return {
            error: err,
            stderr: JSON.stringify({
                message: err.message,
                stack: err.stack,
            }),
            stdout: 'There was an error calling: ' + execString,
            messages: [
                'There was an error calling: ' +
                    execString +
                    '. ' +
                    JSON.stringify({
                        message: err.message,
                        stack: err.stack,
                    }),
            ],
        }
    }
}

const sleep = async function (ms) {
    let sleepTime = ms / 1000
    let cmd = 'sleep ' + sleepTime
    console.log('sleep command:', cmd)
    let sleepMessages = await execFunction(cmd)
    return sleepMessages
}
/*

*/
const commands = {
    container: async function (config) {
        console.log('config in container command', config)
        /*
        {
            siteId: 'dn',
            cmd: 'container',
            page: 1,
            totalPages: 1,
            containerCommand: 'up' || 'down',
            data:[],
            key:'asdfasdf',
            stackKey:???,
            stackPage: ???,
            stackTotalPages: ???
        }
        */

        let messages = []
        //check environment
        let env = findWhichEnv()

        //check containerCommand
        //get namespace
        //build command
        let namespace = process.env.NAMESPACE
        let canRun = true
        if (namespace === undefined) {
            canRun = false
            messages.push(
                'Container Command could not run process.env.NAMESPACE is undefined.'
            )
        }
        if (typeof config.siteId === 'undefined') {
            canRun = false
            messages.push(
                'Container Command could not run, siteId is not provided in config.'
            )
        }
        if (typeof config.containerCmd === 'undefined') {
            canRun = false
            messages.push(
                'Container Command could not run, containerCmd is not provided in config.'
            )
        }
        if (canRun) {
            let execCmd = ''
            let serviceName = config.siteId
            if (config.containerCmd === 'up') {
                //Producer needs to run this before each export to start the service
                execCmd =
                    'ignore=`aws ecs update-service --service ' +
                    serviceName +
                    ' --cluster  ' +
                    namespace +
                    '-cluster --desired-count 1 | jq`\\\n' +
                    'count=`aws ecs describe-services --service  ' +
                    serviceName +
                    ' --cluster $NAMESPACE-cluster | jq .services[].deployments[].runningCount`\\\n' +
                    'while [ $count -lt 1 ]\\\n' +
                    'do\\\n' +
                    'count=`aws ecs describe-services --service  ' +
                    serviceName +
                    ' --cluster ' +
                    namespace +
                    '-cluster | jq .services[].deployments[].runningCount`\\\n' +
                    'done'
            }
            if (config.containerCmd === 'down') {
                //after finishing export
                execCmd =
                    ' ignore=`aws ecs update-service --service ' +
                    serviceName +
                    ' --cluster ' +
                    namespace +
                    '-cluster --desired-count 0 | jq`'
            }

            if (execCmd.length > 0) {
                if (env === 'local') {
                    messages.push(
                        'Skipping container command in local environment: ' +
                            execCmd
                    )
                } else {
                    let execMessages = await execFunction(execCmd)
                    messages = messages.concat(execMessages.messages)
                }
            } else {
                messages.push(
                    'No matching container command found, skipping container command.'
                )
            }
        }

        console.log('container command messages', messages)

        return messages
    },
    rabbitmq: async function (config) {
        console.log('config in commands rabbitmq', config)
        let producerMessage = ''
        if (typeof config.producerMessage == 'undefined') {
            for (arg in config) {
                producerMessage += arg + '='
                if (typeof config[arg] == 'Object') {
                    producerMessage += config[arg].join(',')
                } else {
                    producerMessage += config.arg
                }
                producerMessage += '&'
            }
        } else {
            producerMessage = config.producerMessage
        }
        console.log('producerMessage in rabbitmq command', producerMessage)
        producer.start(producerMessage).catch((err) => {
            console.log(err)
        })
        return [
            config.siteId + ' ' + config.task + ' started.' + getTimeStamp(),
        ]
    },
    multiFlushVarnish: async function (config) {
        let messages = []
        if (typeof config.paths == 'undefined' || config.paths.length == 0) {
            config.paths = ['/']
        }
        let finalPaths = []
        //add a slash version for those without and remove star
        config.paths.forEach((p) => {
            let currPath = p.replace('*', '')
            finalPaths.push(currPath)
            if (!currPath.endsWith('/')) {
                finalPaths.push(currPath + '/')
            }
        })

        //remove duplicates
        finalPaths = [...new Set(finalPaths)]

        let promiseArr = []
        for (let i = 0; i < finalPaths.length; i++) {
            promiseArr.push(
                commands.flushVarnish({
                    siteId: config.siteId,
                    path: finalPaths[i],
                })
            )
        }
        let varnishMessages = await Promise.all(promiseArr)
        for (let i = 0; i < config.paths.length; i++) {
            messages = messages.concat(varnishMessages[i])
        }
        let whichEnv = findWhichEnv()
        if (whichEnv != 'local') {
            let sleepMessages = await sleep(15000)
            messages = messages.concat(sleepMessages.messages)
        }
        return messages
    },
    flushVarnish: async function (config) {
        let api = false
        if (typeof config != 'undefined' && typeof config.api != 'undefined') {
            api = config.api
        }
        let messages = []
        if (typeof config.siteId == 'undefined') {
            messages.push(
                'siteId not defined in flushVarnish. Varnish not flushed.'
            )
            return messages
        }
        if (typeof config.path == 'undefined') {
            config.path = '/'
        }
        let domain = ''
        switch (config.siteId) {
            case 'dn':
                domain = 'diamondnexus'
                break
            case 'tf':
                domain = '1215diamonds'

                break
            case 'fa':
                domain = 'foreverartisans'
                break
            default:
        }

        let curlCommand =
            "curl -X PURGE -H 'X-Magento-Tags-Pattern: .*' http://" +
            process.env.MAG_NAME

        if (api) {
            curlCommand += '-api'
        }

        curlCommand += '.' + domain + '.com' + config.path
        messages.push('curl command: ' + curlCommand)

        let execMessages = await execFunction(curlCommand)
        console.log('curl execMessages', execMessages)
        /* execMessages
            {
            error,
            stderr,
            stdout,
            messages,
            }
        */
        //messages = messages.concat(execMessages.stderr)
        return messages
    },
    cleanlogs: async function (config) {
        let messages = []
        /*
        {
            siteId: 'api,
        }
        */
        let logDir = getLogDir()
        let siteId = config.siteId
        logDir += siteId + '/'
        let maxLogsInDir = 20
        let filesToRemove = []
        try {
            const dirpath = path.join(logDir)
            let fileList = await readdirChronoSorted(dirpath)
            for (let i = 0; i < fileList.length; i++) {
                if (i > maxLogsInDir) {
                    filesToRemove.push(logDir + fileList[i])
                }
            }
            if (filesToRemove.length > 0) {
                for (let i = 0; i < filesToRemove.length; i++) {
                    try {
                        await fs.unlink(filesToRemove[i])
                    } catch (error) {
                        console.error(error)
                    }
                }
            }
            //this is for oldest to newest sort
            // console.log(await readdirChronoSorted(dirpath, -1))
        } catch (err) {
            console.log(err)
        }
        try {
            const dirpath = path.join(logDir + 'inprogress/')
            let fileList2 = await readdirChronoSorted(dirpath)
            for (let i = 0; i < fileList2.length; i++) {
                let fsstatResult = await fs.stat(dirpath + fileList2[i])
                if (fsstatResult.err) {
                    console.error(
                        'err unlinking old inprogress cache logs',
                        fsstatResult.err
                    )
                } else {
                    let now = new Date().getTime()

                    //delete inprogress files older than two minutes 120000
                    let endTime =
                        new Date(fsstatResult.ctime).getTime() + 120000

                    if (now > endTime) {
                        try {
                            await fs.unlink(dirpath + fileList2[i])
                            console.log(
                                'removed old inprogress cache log: ' +
                                    dirpath +
                                    fileList2[i]
                            )
                        } catch (err) {
                            console.log(
                                'unlink err trying to get rid of old inprogress logs',
                                err
                            )
                        }
                    } else {
                        console.log('now is NOT > endTime', now, endTime)
                    }
                }
            }
            //this is for oldest to newest sort
            // console.log(await readdirChronoSorted(dirpath, -1))
        } catch (err) {
            console.log(err)
        }
        messages.push(filesToRemove.length + ' ' + siteId + ' logs cleaned')
        return messages
    },
    checkrunning: async function (
        config = {
            distributionId: '',
            invalidationId: '',
        }
    ) {
        try {
            let messages = []
            let status = ''
            let checkcmd =
                'sleep 10 && aws cloudfront get-invalidation --distribution-id ' +
                config.distributionId +
                ' --id ' +
                config.invalidationId
            let thereWasAnError = false
            while (status != 'Completed') {
                console.log('in while loop waiting for cache to clear')
                execMessages = await execFunction(checkcmd)
                console.log('while loop execMessages', execMessages)
                cacheResponseJson = JSON.parse(execMessages.stdout)
                status = cacheResponseJson.Invalidation.Status
                messages = messages.concat(execMessages.messages)
                if (execMessages.error != undefined) {
                    console.log('error checking on cache invalidaion')
                    thereWasAnError = true
                    break
                }
            }
            return { messages, thereWasAnError }
        } catch (err) {
            console.log('err in checkrunning', err)
            return ['error checking on cache clear']
        }
    },
    cacheclear: async function (
        config = {
            siteId: '',
        }
    ) {
        let messages = []
        console.log('cacheclear command', 'config', config)
        let whichEnv = findWhichEnv()

        /*
        {
            data:[] //paths like '/on-sale*','/on-sale/*'
            siteId: 'dn' //dn,tf,fa,api,other
        }
        */
        let siteId = ''
        if (typeof config.siteId == 'undefined') {
            messages.push('missing siteId in cacheflush')
            return messages
        }
        siteId = config.siteId

        let varnishMessages = []
        if (typeof config.varnishFlushedAlready == 'undefined') {
            console.log('calling multiFlushVarnish')
            varnishMessages = await commands.multiFlushVarnish({
                siteId,
                paths: config.data,
            })
            console.log('varnishMessages', varnishMessages)
            messages = messages.concat(varnishMessages)
            config.varnishFlushedAlready = true
        }

        if (whichEnv === 'local') {
            messages.push(
                config.siteId + ': skipping cache clear in ' + whichEnv + ' env'
            )
            return messages
        }

        messages.push(
            'Command: Cacheclear. Cacheclear Config: ' + JSON.stringify(config)
        )

        if (typeof awsDistributions[siteId] == 'undefined') {
            messages.push('missing siteId in awsDistributions in cacheflush')
            return messages
        }
        if (typeof awsDistributions[siteId][whichEnv] == 'undefined') {
            messages.push(
                'missing siteId env in awsDistributions in cacheflush'
            )
            return messages
        }
        //clean out old logs
        let logMsgs = await commands.cleanlogs({ siteId })
        messages = messages.concat(logMsgs)
        let distributionId = awsDistributions[siteId][whichEnv]
        let invalidationId = ''
        let time = Date.now()
        let items = config.data
        let quantity = config.data.length
        let callerReference =
            'producer__' + whichEnv + '__' + config.siteId + '__' + time
        let fileName = callerReference + '.txt'
        let flushApi = false
        let flushOther = false
        if (typeof config.flushApi != 'undefined' && config.flushApi) {
            flushApi = true
        }
        if (typeof config.flushOther != 'undefined' && config.flushOther) {
            flushOther = true
        }

        let callerKey = makeCacheKey(
            JSON.stringify({
                Paths: {
                    Quantity: quantity,
                    Items: items,
                },
            })
        )

        let content = JSON.stringify({
            Paths: {
                Quantity: quantity,
                Items: items,
            },
            CallerReference: callerReference + '__' + callerKey,
        })
        let logDir = getLogDir()
        let dirPath = logDir + config.siteId + '/'
        let cacheKey = makeCacheKey(content)
        console.log('cacheKey', cacheKey, 'content', content)
        //check if a file with the same parameters is in progress
        let checkFile = dirPath + 'inprogress/' + cacheKey + '.txt'
        console.log('checkFile', checkFile)
        let isOriginalCacheQuery = false
        let checkExists = true
        try {
            let fsstatresult = await fs.stat(checkFile)
            console.log('fsstatresult', fsstatresult)
        } catch (err) {
            //console.log('err fsstat', err)
            // console.log('previously matching cache clear file not found')
            checkExists = false
            // if( err.code === 'ENOENT'){

            // }
        }
        if (!checkExists) {
            isOriginalCacheQuery = true
            console.log('no matching cache clear in progress')
            let fullFilePath = dirPath + fileName

            await fs.writeFile(fullFilePath, content, 'utf8')
            await fs.chmod(fullFilePath, 0o775)

            let execMessages = {}
            execMessages = await execFunction('cat ' + fullFilePath)
            messages = messages.concat(execMessages.messages)
            let clearcmd =
                'aws cloudfront create-invalidation --distribution-id ' +
                distributionId +
                ' --invalidation-batch file://' +
                fullFilePath
            execMessages = await execFunction(clearcmd)
            console.log('execMessages after create-invalidation', execMessages)
            if (typeof execMessages.error != 'undefined') {
                console.log(
                    'error in create-invalidation',
                    execMessages.messages
                )
                //messages = messages.concat(execMessages.messages)
                messages = messages.concat([
                    'There was an error in create-invalidation while trying to flush aws.',
                ])
                return messages
            }
            if (isJson(execMessages.stdout)) {
                let cacheResponseJson = JSON.parse(execMessages.stdout)
                if (cacheResponseJson.Invalidation.Status == 'Completed') {
                    let dateStr = getTimeStamp()
                    messages = [
                        whichEnv +
                            ' -- ' +
                            config.siteId +
                            ' -- cache cleared. Time: ' +
                            dateStr,
                    ]

                    return messages
                }
                invalidationId = cacheResponseJson.Invalidation.Id
                let content = JSON.stringify({
                    distributionId: distributionId,
                    invalidationId: invalidationId,
                })
                await fs.writeFile(checkFile, content, 'utf8')
                await fs.chmod(checkFile, 0o775)
            }
        } else {
            console.log(
                'cache clear checkFile found, an identical clear is already in progress'
            )
            try {
                let checkFileData = await fs.readFile(checkFile, 'utf8')
                console.log('checkFileData', checkFileData)
                let checkFileJson = JSON.parse(checkFileData)
                invalidationId = checkFileJson.Invalidation.Id
            } catch (err) {
                //this is most likely cause by a flush completing and the file being removed
                console.log('err in trying to read checkFile', err)
                let dateStr = getTimeStamp()
                //we should see another message from the previous cache clear
                return [
                    dateStr +
                        ': unable to clear cache again, it appears it was just cleared',
                ]
            }
        }

        let { checkMessages, thereWasAnError } = await commands.checkrunning({
            distributionId,
            invalidationId,
        })
        if (thereWasAnError) {
            console.log('there was an error, trying the cache clear again')
            //try again if there was a problem
            if (typeof config.attempts == 'undefined') {
                config.attempts = 0
            } else {
                config.attempts = config.attempts + 1
            }
            if (config.attempts > 3) {
                messages.push('Giving up cache clear after 3 attempts.')
                return messages
            }
            let sleepMessages = await sleep(15000)
            messages = messages.concat(sleepMessages.messages)
            let newMessages = commands.cacheclear(config)
            messages = messages.concat(newMessages)
        }
        if (isOriginalCacheQuery) {
            console.log('removing in progress cache file: ' + checkFile)
            try {
                await fs.unlink(checkFile)
            } catch (err) {
                console.log('err trying to unlink checkFile', err)
            }
        }

        messages = messages.concat(checkMessages)

        messages = messages.concat(execMessages.messages)

        if (flushApi) {
            execMessages = await commands.cacheclear({
                data: ['/*', '/'],
                siteId: 'api',
            })
            messages = messages.concat(execMessages)
        }
        if (flushOther) {
            execMessages = await commands.cacheclear({
                data: ['/*', '/'],
                siteId: 'other',
            })
            messages = messages.concat(execMessages)
        }

        console.log('messages in cacheclear', messages)

        let dateStr = getTimeStamp()
        //overwrite the messages to just show a short message on the producer screen
        messages = [
            whichEnv +
                ' -- ' +
                config.siteId +
                ' -- cache cleared. Time: ' +
                dateStr,
        ]
        messages = varnishMessages.concat(messages)

        // messages.push(
        //     whichEnv +
        //         ' -- ' +
        //         config.siteId +
        //         ' -- cache cleared. Time: ' +
        //         dateStr
        // )

        return messages
    },
}
const processStoredCommand = async function (jsonObj) {
    let messages = []
    jsonObj = JSON.parse(jsonObj)
    /* 
        the command json needs some fields
        all data from multiple requests will be concatendated
        based on the site id and key
        the key can be any string but should match across requests
        if a new key comes in the old data and key are deleted
        and the page count is reset
        if you just have one page
        set the page and totalPages to 1
        the cmd should match a command in the command object up above
        {
          siteId: settings.siteId,
          cmd: 'cacheclear',
          key: key,
          page: i + 1,
          totalPages: allRequestsChunked.length,
          data: allRequestsChunked[i],
        //   env: settings.whichEnv,
        //   incrementalBuild: settings.incrementalBuild,
        //   incrementalBuildConfig: settings.incrementalBuildConfig,
        }
    */
    if (
        typeof jsonObj.key != 'undefined' &&
        typeof jsonObj.siteId != 'undefined' &&
        typeof jsonObj.data != 'undefined' &&
        typeof jsonObj.page != 'undefined' &&
        typeof jsonObj.totalPages != 'undefined'
    ) {
        if (typeof storedCommands[jsonObj.siteId] != 'undefined') {
            if (storedCommands[jsonObj.siteId].key != jsonObj.key) {
                storedCommands[jsonObj.siteId].key = jsonObj.key
                storedCommands[jsonObj.siteId].data = jsonObj.data
                storedCommands[jsonObj.siteId].pages = 1
            } else {
                storedCommands[jsonObj.siteId].pages++
                storedCommands[jsonObj.siteId].data = storedCommands[
                    jsonObj.siteId
                ].data.concat(jsonObj.data)
            }

            if (
                storedCommands[jsonObj.siteId].pages == jsonObj.totalPages &&
                typeof jsonObj.cmd != 'undefined' &&
                typeof commands[jsonObj.cmd] != 'undefined'
            ) {
                jsonObj.data = storedCommands[jsonObj.siteId].data
                if (
                    typeof jsonObj.stackPage != 'undefined' &&
                    typeof jsonObj.stackTotalPages != 'undefined' &&
                    typeof jsonObj.stackKey != 'undefined'
                ) {
                    if (
                        jsonObj.stackKey !=
                        storedCommands.stacks[jsonObj.siteId].stackKey
                    ) {
                        // console.log(
                        //     'Old stackKey was: ' +
                        //         storedCommands.stacks[jsonObj.siteId].stackKey +
                        //         '  -- New stackKey supplied: ' +
                        //         jsonObj.stackKey +
                        //         ' resetting stack '
                        // )
                        storedCommands.stacks[jsonObj.siteId].stackKey =
                            jsonObj.stackKey
                        storedCommands.stacks[jsonObj.siteId].commands = []
                    }
                    // console.log('adding stored command to stack', jsonObj)
                    storedCommands.stacks[jsonObj.siteId].commands.push(jsonObj)

                    addDisplayMessages(
                        'Adding command to stack ' +
                            jsonObj.siteId +
                            ' ' +
                            jsonObj.cmd
                    )
                    if (
                        storedCommands.stacks[jsonObj.siteId].commands
                            .length === jsonObj.stackTotalPages
                    ) {
                        for (let m = 0; m < messages.length; m++) {
                            displaymessages.unshift(messages)
                        }
                        //sort them based on page number lowest first then highest
                        storedCommands.stacks[jsonObj.siteId].commands.sort(
                            (a, b) => {
                                return a.stackPage - b.stackPage
                            }
                        )
                        // console.log(
                        //     'sorted commands',
                        //     storedCommands.stacks[jsonObj.siteId].commands
                        // )
                        while (
                            storedCommands.stacks[jsonObj.siteId].commands
                                .length > 0
                        ) {
                            //pop the lowest numbered command off the command stack
                            //and run it
                            let stackCmd =
                                storedCommands.stacks[
                                    jsonObj.siteId
                                ].commands.shift()
                            addDisplayMessages(
                                'running command: ' +
                                    JSON.stringify(stackCmd, null, 4) +
                                    '\n' +
                                    getTimeStamp()
                            )
                            let cmdMessages = await commands[stackCmd.cmd](
                                stackCmd
                            )
                            addDisplayMessages(cmdMessages)
                        }
                    }
                } else {
                    displaymessages.unshift(
                        'running command: ' +
                            JSON.stringify(jsonObj, null, 4) +
                            '\n' +
                            getTimeStamp()
                    )
                    let cmdMessages = await commands[jsonObj.cmd](jsonObj)
                    addDisplayMessages(cmdMessages)
                }
            }
        }
    }
    addDisplayMessages(messages)
    return true
}

const isJson = function (item) {
    item = typeof item !== 'string' ? JSON.stringify(item) : item

    try {
        item = JSON.parse(item)
    } catch (e) {
        return false
    }

    if (typeof item === 'object' && item !== null) {
        return true
    }

    return false
}
module.exports = {
    storedCommands,
    awsDistributions,
    commands,
    isJson,
    findWhichEnv,
    convertTZ,
    getTimeStamp,
    processStoredCommand,
    makeId,
    addDisplayMessages,
}
