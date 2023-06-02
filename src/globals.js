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

const dn_domain = 'diamondnexus';
const mag_url =
    ['m2-dev', 'm2-staging', 'www'].indexOf(process.env.MAG_NAME) != -1
        ? 'https://' +
        process.env.MAG_NAME +
        '-admin' +
        '.' + dn_domain + '.com' +
        '/MissScarletWrenchKitchen/'
        : 'https://' +
        process.env.MAG_NAME +
        '-admin' +
        '.' + dn_domain + '.com' + '/hive/'
const ports = {
    fa: process.env.PORT_FA,
    fa_serve: process.env.PORT_SERVE_FA,
    fa_domain: 'foreverartisans',
    tf: process.env.PORT_TF,
    tf_serve: process.env.PORT_SERVE_TF,
    tf_domain: '1215diamonds',
    dn: process.env.PORT_DN,
    dn_serve: process.env.PORT_SERVE_DN,
    dn_domain: dn_domain,
    producer_name: process.env.PRODUCER_NAME,
    host_name: process.env.MAG_NAME,
    mag_name: process.env.MAG_NAME,
    mag_url: mag_url,
    wp_name: process.env.WP_NAME,
    appSiteIds: ['dn', 'tf', 'fa'],
    appRoutes: [
        'blog',
        'builder',
        'collections',
        'diamonds',
        'errors',
        'favorites',
        'home',
        'learn',
        'misc',
        'products',
        'promo',
        'search',
        'stones',
    ],
    apiFlushJson: JSON.stringify({
        siteId: 'api',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*'],
    }),
    otherFlushJson: JSON.stringify({
        siteId: 'other',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*'],
    }),
    dnFlushJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*'],
    }),
    tfFlushJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*'],
    }),
    faFlushJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*'],
    }),
    dnFlushGqlJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/graphql*'],
    }),
    tfFlushGqlJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/graphql*'],
    }),
    faFlushGqlJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/graphql*'],
    }),
    dnVarnishJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    tfVarnishJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    faVarnishJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    dnVarnishApiJson: JSON.stringify({
        siteId: 'dn',
        api: true,
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    tfVarnishApiJson: JSON.stringify({
        siteId: 'tf',
        api: true,
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    faVarnishApiJson: JSON.stringify({
        siteId: 'fa',
        api: true,
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    dnDownJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'container',
        containerCmd: 'down',
        key: 'dnDown' + makeId(10),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    tfDownJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'container',
        containerCmd: 'down',
        key: 'tfDown' + makeId(10),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    faDownJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'container',
        containerCmd: 'down',
        key: 'faDown' + makeId(10),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    moveWordpressDB: JSON.stringify({
        siteId: 'dn',
        cmd: 'moveWordpressDB',
        key: 'moveWordpressDB' + makeId(10),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    whichEnv: findWhichEnv(),
    indexer_status: null,
    active_sale_rules: []
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

module.exports = {
    awsDistributions,
    findWhichEnv,
    dn_domain,
    mag_url,
    makeId,
    ports
}