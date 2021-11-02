const amqp = require('amqplib')
const queues = {
    dn: process.env.MESSAGE_QUEUE_NAME_DN,
    fa: process.env.MESSAGE_QUEUE_NAME_FA,
    tf: process.env.MESSAGE_QUEUE_NAME_TF,
}

// const winston = require('winston');

module.exports.start = async (message) => {
    let queue
    let messageParts = message.split('&')
    // let taskstr = ''
    // const [taskname, site] = taskstr.split('--')
    let taskname = ''
    let site = ''
    for (let i = 0; i < messageParts.length; i++) {
        let kv = messageParts[i].split('=')
        if (kv.length != 2) {
            continue
        }
        let k = kv[0]
        let v = kv[1]

        if (k == 'site') {
            site = v
        } else {
            if (taskname.length > 0) {
                taskname += '&'
            }
            taskname += k + '=' + v
        }
    }

    if (site in queues) {
        queue = queues[site]
    } else {
        console.log(
            'message not sent, site not specified, e.g. add "--dn" to task message'
        )
        return
    }
    const connection = await amqp.connect(process.env.MESSAGE_QUEUE)

    const channel = await connection.createChannel()
    await channel.assertQueue(queue, { durable: true })
    // const task = {
    //     message: `${taskname}`,
    //     site: `${site}`,
    // }
    // await channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)), {
    //     contentType: 'application/json',
    //     persistent: true,
    // })
    const task = `${taskname}`
    console.log(task)
    await channel.sendToQueue(queue, Buffer.from(task), {
        persistent: true,
    })

    setTimeout(() => {
        channel.close()
        connection.close()
    }, 3000)

    process.on('exit', (code) => {
        channel.close()
        connection.close()
        console.log(`Closing rabbitmq channel`)
    })
}
