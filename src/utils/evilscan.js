// evilscan - 网络扫描，不依赖runtime.js
const EventEmitter = require('events').EventEmitter;
const TcpScan = require("./tcp-scan.js");
const options = require("./evilscan-options.js");
const dns = require("dns");
const async = require("./async-dll.js");

var geoip;

class Evilscan extends EventEmitter {

    constructor(opts, callback) {
        super();

        this.lastMessage = 'Starting';
        this.paused = false;
        this.progress = 0;
        this.progressTimer = null;
        this.info = {
            nbIpToScan:0,
            nbPortToScan:0
        };
        this.cacheGeo = {};
        this.cacheDns = {};

        this.options = opts || {};
        this.q = null;

        if (!opts.ips) {
            // Called from a js script, reparse options
            options.parse(opts, (err, opts) => {

                if (err) {
                    // @TODO: is there a way to know if error handler has been
                    // defined rather than this shit of try catch ?
                    try {
                        return this.emit('error', err);
                    } catch(e) {
                        //
                    }
                }

                if (err && callback) {
                    return callback(err, this);
                }

                this.options = opts;
                this._init();
                callback && callback(null, this);
            });
            return;
        }

        this._init();
    }

    _init() {

        //if (this.options && this.options.concurrency) {
        var self = this;
        var concurrency = this.options.concurrency||500;
        var paused = false, running = 0, queue = [], intervalId = null;
        var events = {};
        function on(ev, fn) { (events[ev]=events[ev]||[]).push(fn); }
        function emit(ev, data) { (events[ev]||[]).forEach(function(f){ f(data); }); }
        function next() {
            if (paused || running >= concurrency || !queue.length) return;
            var task = queue.shift(); running++;
            emit('jobStart', task.args);
            task.fn(task.args, function() { running--; emit('jobEnd', task.args); next(); });
        }
        this.q = {
            add: function(fn, args) { queue.push({fn:fn, args:args}); next(); },
            pause: function(p) { paused = p; if (!paused) next(); },
            setInterval: function(ms) { if (intervalId) clearInterval(intervalId); intervalId = setInterval(function() { emit('start'); next(); emit('end'); }, ms); },
            on: on,
            run: function() { next(); },
            abort: function() { queue = []; paused = true; if (intervalId) clearInterval(intervalId); },
            stats: function() { return { running: running, queued: queue.length, concurrency: concurrency }; }
        };

        this._initTestLocalhost();
        this._initQueue();
        this._initQueueProgress();
        this._initQueuePause();
        //portscan.setSocketTimeout(argv.timeout||1000);
    }

    _initTestLocalhost() {
        // For tests, the telnet server can not
        // accept more than 50 simultaneous connection,
        // so let's make a pause between each pools

        if (!this.options || !this.options.ips || !this.options.ips.length) {
            return;
        }

        if (
            this.options.ips.length == 1
            &&
            this.options.ips[0].match(/^127.0.0.1\//)
        ) {
            this.q.setInterval(1000);
        }
    }

    _initQueue() {
        // Push scan jobs in the queue

        if (!this.options || !this.options.ips || !this.options.ips.length) {
            return;
        }

        const maxi = this.options.ips.length;
        let maxj = this.options.ports.length;
        const maxt = maxi*maxj;
        let i = 0;
        let j = 0;
        let ip;
        const copyOfIps = JSON.parse(JSON.stringify(this.options.ips));

        this.info.combinaison = maxt;

        while (copyOfIps.length) {
            ip = copyOfIps.shift();
            if (this.options.ports.length) {
                maxj = this.options.ports.length;
                for (j=0;j<maxj;j++) {
                    const args = {
                        ip,
                        port:this.options.ports[j],
                        i,
                        max:maxt
                    };
                    this.info.nbPortToScan++;
                    this.q.add(this.scan.bind(this), args);
                    i++;
                }
                this.info.nbIpToScan++;
            } else {
                const args = {
                    ip,
                    i,
                    max:maxt
                };
                this.q.add(this.scan.bind(this), args);
                this.info.nbPortToScan = 0;
                this.info.nbIpToScan = 1;
                i++;
            }
        }

        this.q.on('end', () => {
            this.cacheGeo = {};
            this.cacheDns = {};
            this.emit('done');
            this.callbackRun && this.callbackRun();
        });

        this.q.on('jobStart', data => {
            let str = 'Scanning '+data.ip;
            if (data.port) str+=':'+data.port;
            this.lastMessage = str;
            this.emit('scan', data);
        });

        this.q.on('jobEnd', data => {
            let str = 'Scanned '+data.ip;
            if (data.port) str+=':'+data.port;
            this.lastMessage = str;
        });
    }

    _initQueueProgress() {
        if (!this.options.progress) {
            return;
        }

        this.progressTimer = setInterval(this._triggerQueueProgress.bind(this), 1000);

        this.q.on('start', () => {
            this.emit('start');
            this._triggerQueueProgress();
        });

        this.q.on('end', () => {
            clearInterval(this.progressTimer);
            this._triggerQueueProgress();
            this.callback && this.callback();
        });
    }

    _initQueuePause() {

        if (process.eventNames().indexOf('SIGUSR2') >= 0) {
            // avoid MaxListenersExceededWarning
            // see https://github.com/eviltik/evilscan/issues/41#issuecomment-364630079
            // thanks John cetfor for pointing this ;)
            return;
        }

        process.on('SIGUSR2', () => {
            if (!this.paused) {
                this.paused = true;
                this.lastMessage = 'Pause';
            } else {
                this.paused = false;
            }
            this.q.pause(this.paused);
        });
    }

    _triggerQueueProgress() {
        var o = this.q.stats();
        if (!this.paused) {
            o._message = this.lastMessage;
        } else {
            o._message = 'Paused';
            o._status = 'Paused';
        }

        this.progress = o._progress;
        this.emit('progress', o, this);
    }

    _geolocate(ip, callback) {

        if (!this.options.geo) {
            return callback();
        }

        if (!geoip) {
            geoip = { lookup: function(ip) { return ip; } };
        }

        if (this.cacheGeo[ip]) {
            return callback(null, this.cacheGeo[ip]);
        }

        callback(null, geoip.lookup(ip));
    }

    _geolocateFormatResult(data, result) {
        if (!this.options.geo) {
            return result;
        }

        result.city = '';
        result.country = '';
        result.region = '';
        result.latitude = '';
        result.longitude = '';

        if (!data) {
            return result;
        }

        this.cacheGeo[result.ip] = data;

        result.city = data.city || '';
        result.country = data.country || '';
        result.region = data.region || '';
        result.latitude = data.ll[0] || '';
        result.longitude = data.ll[1] || '';

        return result;
    }

    _reverseDns(ip, callback) {
        if (!this.options.reverse) {
            callback();
            return;
        }

        if (this.cacheDns[ip]) {
            callback(null, this.cacheDns[ip]);
            return;
        }

        dns.reverse(ip, (err, domains) => {
            if (err) {
                if (err.code == 'ENOTFOUND') {
                    callback(null);
                    return;
                }

                // unknow error
                this.emit('error', {
                    fnc:'lookupDns',
                    err
                });
                callback(null);
                return;
            }

            if (!domains.length) {
                callback(null);
                return;
            }

            callback(null, domains[0]);
        });
    }

    _reverseDnsFormatResult(data, result) {
        if (!this.options.reverse || !result) return result;
        result.reverse = '';
        if (!data) return result;
        result.reverse = data;
        this.cacheDns[result.ip] = data;
        return result;
    }

    _portScan(ip, port, callback) {
        if (!port) {
            return callback();
        }

        const t = new TcpScan({
            ip,
            port,
            banner : this.options.banner,
            bannerlen : this.options.bannerlen,
            timeout : this.options.timeout
        });

        t.analyzePort(callback);
    }

    _portScanFormatResult(data, result) {

        if (!result || !this.options.port || !data) {
            return result;
        }

        if (!this.options.showTimeout && data.status.match(/timeout/i)) {
            return result = null;
        }

        if (!this.options.showRefuse && data.status.match(/refuse/i)) {
            return result = null;
        }

        if (!this.options.showOpen && data.status.match(/open/i)) {
            return result = null;
        }

        if (!this.options.showUnreachable && data.status.match(/unreachable/i)) {
            return result = null;
        }

        if (this.options.banner) {
            result.banner = data.banner || '';
        }

        if (this.options.bannerraw) {
            result.bannerraw = data.raw || '';
        }

        result.status = data.status;

        return result;
    }

    _formatFinalResult(result) {

        if (!result) {
            return result;
        }

        if (this.options.reverse && this.options.reversevalid && result.reverse == '') {
            result = null;
        }

        if (!result.port) delete result.port;

        if (this.options.json) {

            if (result.status && result.status.match(/close/i)) {
                delete result.banner;
                delete result.bannerraw;
            }

            if (!result.reverse) {
                delete result.reverse;
            }

            if (!result.banner) {
                delete result.banner;
            }

            if (!result.bannerraw) {
                delete result.bannerraw;
            }
        }
        return result;
    }

    scan(args, nextIteration) {

        let result = {
            ip:args.ip,
            port:args.port
        };

        async.series([
            (next) => {
                this._geolocate(args.ip, next);
            },
            (next) => {
                this._reverseDns(args.ip, next);
            },
            (next) => {
                this._portScan(args.ip, args.port, next);
            }
        ], (err, arr) => {
            result = this._geolocateFormatResult(arr[0], result);
            result = this._reverseDnsFormatResult(arr[1], result);
            result = this._portScanFormatResult(arr[2], result);
            result = this._formatFinalResult(result);
            if (result) {
                this.emit('result', result);
            }
            nextIteration();
        });
    }

    run(callback) {
        this.callbackRun = callback;
        if (!this.q) { this._init(); }
        this.q && this.q.run();
        return;
    }

    getOptions() {
        return this.options;
    }

    pause() {
        if (this.paused) return;
        this.paused = true;
        this.q.pause(true);
    }

    unpause() {
        if (!this.paused) return;
        this.paused = false;
        this.q.pause(false);
    }

    abort() {
        this.q.abort();
        return;
    }

    getInfo() {
        return this.info;
    }

}

module.exports = Evilscan;
