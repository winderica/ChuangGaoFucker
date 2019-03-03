function unpinSSL() {

    /*
    hook list:
    1.SSLcontext
    2.okhttp
    3.webview
    4.XUtils
    5.httpclientandroidlib
    6.JSSE
    7.network\_security\_config (android 7.0+)
    8.Apache Http client (support partly)
    */

    // Attempts to bypass SSL pinning implementations in a number of
    // ways. These include implementing a new TrustManager that will
    // accept any SSL certificate, overriding OkHTTP v3 check()
    // method etc.
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var HostnameVerifier = Java.use('javax.net.ssl.HostnameVerifier');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    var quiet_output = false;

    // Helper method to honor the quiet flag.
    function quiet_send(data) {

        if (quiet_output) {

            return;
        }

        send(data)
    }


    // Implement a new TrustManager
    // ref: https://gist.github.com/oleavr/3ca67a173ff7d207c6b8c3b0ca65a9d8
    // Java.registerClass() is only supported on ART for now(201803). 所以android 4.4以下不兼容,4.4要切换成ART使用.
    /*
    06-07 16:15:38.541 27021-27073/mi.sslpinningdemo W/System.err: java.lang.IllegalArgumentException: Required method checkServerTrusted(X509Certificate[], String, String, String) missing
    06-07 16:15:38.542 27021-27073/mi.sslpinningdemo W/System.err:     at android.net.http.X509TrustManagerExtensions.<init>(X509TrustManagerExtensions.java:73)
            at mi.ssl.MiPinningTrustManger.<init>(MiPinningTrustManger.java:61)
    06-07 16:15:38.543 27021-27073/mi.sslpinningdemo W/System.err:     at mi.sslpinningdemo.OkHttpUtil.getSecPinningClient(OkHttpUtil.java:112)
            at mi.sslpinningdemo.OkHttpUtil.get(OkHttpUtil.java:62)
            at mi.sslpinningdemo.MainActivity$1$1.run(MainActivity.java:36)
    */
    var X509Certificate = Java.use("java.security.cert.X509Certificate");
    var TrustManager;
    try {
        TrustManager = Java.registerClass({
            name: 'org.wooyun.TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) {
                },
                checkServerTrusted: function (chain, authType) {
                },
                getAcceptedIssuers: function () {
                    // var certs = [X509Certificate.$new()];
                    // return certs;
                    return [];
                }
            }
        });
    } catch (e) {
        console.log("registerClass from X509TrustManager >>>>>>>> " + e.message);
    }


    // Prepare the TrustManagers array to pass to SSLContext.init()
    var TrustManagers = [TrustManager.$new()];

    try {
        // Prepare a Empty SSLFactory
        var TLS_SSLContext = SSLContext.getInstance("TLS");
        TLS_SSLContext.init(null, TrustManagers, null);
        var EmptySSLFactory = TLS_SSLContext.getSocketFactory();
    } catch (e) {
        console.log(e.message);
    }

    send('Custom, Empty TrustManager ready');

    // Get a handle on the init() on the SSLContext class
    var SSLContext_init = SSLContext.init.overload(
        '[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom');

    // Override the init method, specifying our new TrustManager
    SSLContext_init.implementation = function (keyManager, trustManager, secureRandom) {

        quiet_send('Overriding SSLContext.init() with the custom TrustManager');

        SSLContext_init.call(this, null, TrustManagers, null);
    };

    /*** okhttp3.x unpinning ***/


    // Wrap the logic in a try/catch as not all applications will have
    // okhttp as part of the app.
    try {

        var CertificatePinner = Java.use('okhttp3.CertificatePinner');

        console.log('OkHTTP 3.x Found');

        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function () {

            quiet_send('OkHTTP 3.x check() called. Not throwing an exception.');
        }

    } catch (err) {

        // If we dont have a ClassNotFoundException exception, raise the
        // problem encountered.
        if (err.message.indexOf('ClassNotFoundException') === 0) {

            throw new Error(err);
        }
    }

    // Appcelerator Titanium PinningTrustManager

    // Wrap the logic in a try/catch as not all applications will have
    // appcelerator as part of the app.
    try {

        var PinningTrustManager = Java.use('appcelerator.https.PinningTrustManager');

        send('Appcelerator Titanium Found');

        PinningTrustManager.checkServerTrusted.implementation = function () {

            quiet_send('Appcelerator checkServerTrusted() called. Not throwing an exception.');
        }

    } catch (err) {

        // If we dont have a ClassNotFoundException exception, raise the
        // problem encountered.
        if (err.message.indexOf('ClassNotFoundException') === 0) {

            throw new Error(err);
        }
    }

    /*** okhttp unpinning ***/


    try {
        var OkHttpClient = Java.use("com.squareup.okhttp.OkHttpClient");
        OkHttpClient.setCertificatePinner.implementation = function (certificatePinner) {
            // do nothing
            console.log("OkHttpClient.setCertificatePinner Called!");
            return this;
        };

        // Invalidate the certificate pinnet checks (if "setCertificatePinner" was called before the previous invalidation)
        var CertificatePinner = Java.use("com.squareup.okhttp.CertificatePinner");
        CertificatePinner.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function (p0, p1) {
            // do nothing
            console.log("okhttp Called! [Certificate]");
            return;
        };
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function (p0, p1) {
            // do nothing
            console.log("okhttp Called! [List]");
            return;
        };
    } catch (e) {
        console.log("com.squareup.okhttp not found");
    }

    /*** WebView Hooks ***/

    /* frameworks/base/core/java/android/webkit/WebViewClient.java */
    /* public void onReceivedSslError(Webview, SslErrorHandler, SslError) */
    var WebViewClient = Java.use("android.webkit.WebViewClient");

    WebViewClient.onReceivedSslError.implementation = function (webView, sslErrorHandler, sslError) {
        quiet_send("WebViewClient onReceivedSslError invoke");
        //执行proceed方法
        sslErrorHandler.proceed();
        return;
    };

    WebViewClient.onReceivedError.overload('android.webkit.WebView', 'int', 'java.lang.String', 'java.lang.String').implementation = function (a, b, c, d) {
        quiet_send("WebViewClient onReceivedError invoked");
        return;
    };

    WebViewClient.onReceivedError.overload('android.webkit.WebView', 'android.webkit.WebResourceRequest', 'android.webkit.WebResourceError').implementation = function () {
        quiet_send("WebViewClient onReceivedError invoked");
        return;
    };

    /*** JSSE Hooks ***/

    /* libcore/luni/src/main/java/javax/net/ssl/TrustManagerFactory.java */
    /* public final TrustManager[] getTrustManager() */

    var TrustManagerFactory = Java.use("javax.net.ssl.TrustManagerFactory");
    TrustManagerFactory.getTrustManagers.implementation = function () {
        quiet_send("TrustManagerFactory getTrustManagers invoked");
        return TrustManagers;
    }

    var HttpsURLConnection = Java.use("javax.net.ssl.HttpsURLConnection");
    /* libcore/luni/src/main/java/javax/net/ssl/HttpsURLConnection.java */
    /* public void setDefaultHostnameVerifier(HostnameVerifier) */
    HttpsURLConnection.setDefaultHostnameVerifier.implementation = function (hostnameVerifier) {
        quiet_send("HttpsURLConnection.setDefaultHostnameVerifier invoked");
        return null;
    };
    /* libcore/luni/src/main/java/javax/net/ssl/HttpsURLConnection.java */
    /* public void setSSLSocketFactory(SSLSocketFactory) */
    HttpsURLConnection.setSSLSocketFactory.implementation = function (SSLSocketFactory) {
        quiet_send("HttpsURLConnection.setSSLSocketFactory invoked");
        return null;
    };
    /* libcore/luni/src/main/java/javax/net/ssl/HttpsURLConnection.java */
    /* public void setHostnameVerifier(HostnameVerifier) */
    HttpsURLConnection.setHostnameVerifier.implementation = function (hostnameVerifier) {
        quiet_send("HttpsURLConnection.setHostnameVerifier invoked");
        return null;
    };

    /*** Xutils3.x hooks ***/
        //Implement a new HostnameVerifier
    var TrustHostnameVerifier;
    try {
        TrustHostnameVerifier = Java.registerClass({
            name: 'org.wooyun.TrustHostnameVerifier',
            implements: [HostnameVerifier],
            method: {
                verify: function (hostname, session) {
                    return true;
                }
            }
        });

    } catch (e) {
        //java.lang.ClassNotFoundException: Didn't find class "org.wooyun.TrustHostnameVerifier"
        console.log("registerClass from hostnameVerifier >>>>>>>> " + e.message);
    }

    try {
        var RequestParams = Java.use('org.xutils.http.RequestParams');
        RequestParams.setSslSocketFactory.implementation = function (sslSocketFactory) {
            sslSocketFactory = EmptySSLFactory;
            return null;
        }

        RequestParams.setHostnameVerifier.implementation = function (hostnameVerifier) {
            hostnameVerifier = TrustHostnameVerifier.$new();
            return null;
        }

    } catch (e) {
        console.log("Xutils hooks not Found");
    }

    /*** httpclientandroidlib Hooks ***/
    try {
        var AbstractVerifier = Java.use("ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier");
        AbstractVerifier.verify.overload('java.lang.String', '[Ljava.lang.String', '[Ljava.lang.String', 'boolean').implementation = function () {
            quiet_send("httpclientandroidlib Hooks");
            return null;
        }
    } catch (e) {
        console.log("httpclientandroidlib Hooks not found");
    }

    /***
     android 7.0+ network_security_config TrustManagerImpl hook
     apache httpclient partly
     ***/
    var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
    // try {
    //     var Arrays = Java.use("java.util.Arrays");
    //     //apache http client pinning maybe baypass
    //     //https://github.com/google/conscrypt/blob/c88f9f55a523f128f0e4dace76a34724bfa1e88c/platform/src/main/java/org/conscrypt/TrustManagerImpl.java#471
    //     TrustManagerImpl.checkTrusted.implementation = function (chain, authType, session, parameters, authType) {
    //         quiet_send("TrustManagerImpl checkTrusted called");
    //         //Generics currently result in java.lang.Object
    //         return Arrays.asList(chain);
    //     }
    //
    // } catch (e) {
    //     console.log("TrustManagerImpl checkTrusted nout found");
    // }

    try {
        // Android 7+ TrustManagerImpl
        TrustManagerImpl.verifyChain.implementation = function (untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
            quiet_send("TrustManagerImpl verifyChain called");
            // Skip all the logic and just return the chain again :P
            //https://www.nccgroup.trust/uk/about-us/newsroom-and-events/blogs/2017/november/bypassing-androids-network-security-configuration/
            // https://github.com/google/conscrypt/blob/c88f9f55a523f128f0e4dace76a34724bfa1e88c/platform/src/main/java/org/conscrypt/TrustManagerImpl.java#L650
            return untrustedChain;
        }
    } catch (e) {
        console.log("TrustManagerImpl verifyChain nout found below 7.0");
    }
}

function padZero(value) {
    if (value < 10) {
        return "0" + ~~value;
    }
    return "" + ~~value;
}

function generateCoordinate(x, y) {
    return {
        "a": +x,
        "o": +y,
        "v": 1,
        "s": 0,
        "t": 0,
        "ac": 0
    };
}

function generateData() {
    var odometer = (3 + Math.random() / 3).toFixed(2);
    var minutes = 15 + Math.random() * 10;
    var activeTime = "00:" + padZero(minutes) + ":" + padZero((minutes % 1) * 60);
    var calorie = +(320 / 30 * minutes).toFixed(1);
    var speed = odometer / minutes * 60;
    var avgSpeed = speed.toFixed(2);
    var maxSpeed = (speed + 0.5 + Math.random() * 0.7).toFixed(2);
    var now = Date.now();
    var beginTime = (new Date(now - minutes * 60000 - new Date().getTimezoneOffset() * 60000)).toISOString().split('.')[0].replace('T', ' ');
    var endTime = (new Date(now - new Date().getTimezoneOffset() * 60000)).toISOString().split('.')[0].replace('T', ' ');
    var isValid = 1;
    var isValidReason = "";
    var stepCount = ~~(3000 + Math.random() * 1000);
    var minutesPerKM = minutes / odometer;
    var pace = [
        {
            km: "1",
            t: padZero(minutesPerKM - Math.random() * 1.5) + "'" + padZero(Math.random() * 60) + "''"
        },
        {
            km: "2",
            t: padZero(minutesPerKM) + "'" + padZero(Math.random() * 60) + "''"
        },
        {
            km: "3",
            t: padZero(minutesPerKM + Math.random() * 1.5) + "'" + padZero(Math.random() * 60) + "''"
        }
    ];
    var minuteSpeed = [];
    for (var i = 1; i <= minutes; i++) {
        minuteSpeed.push({
            min: i,
            v: (speed + Math.random() * (i < minutes / 2 ? 1 : -1)).toFixed(2)
        })
    }
    var minSpeedPerHour = (speed - 0.5 - Math.random() * 0.7).toFixed(2);
    var maxSpeedPerHour = (maxSpeed - Math.random() * 0.4).toFixed(2);
    var avgPace = padZero(minutesPerKM) + "'" + padZero(Math.random() * 60) + "''";
    var lastOdometerTime = "00:" + padZero(minutesPerKM + Math.random() * 1.5) + ":" + padZero(Math.random() * 60);
    var stepMinute = (stepCount / minutes).toFixed(2);
    var beganX = (30.508 + Math.random() / 10e2).toFixed(6);
    var beganY = (114.408 + Math.random() / 10e2).toFixed(6);
    var beganPoint = beganX + "|" + beganY;
    var endX = (30.514 + Math.random() / 10e2).toFixed(6);
    var endY = (114.432 + Math.random() / 10e2).toFixed(6);
    var endPoint = endX + "|" + endY;
    var points = ["30.509, 114.408", "30.511, 114.408", "30.511, 114.410", "30.510, 114.416", "30.510, 114.420", "30.513, 114.421", "30.515, 114.421", "30.514, 114.427", "30.514, 114.430"];
    var coordinate = [];
    coordinate.push(generateCoordinate(beganX, beganY));
    for (var i = 0; i < points.length; i++) {
        var point = points[i].split(', ');
        var x = +point[0] + Math.random() / 10e2;
        var y = +point[1] + Math.random() / 10e2;
        coordinate.push(generateCoordinate(x, y));
    }
    coordinate.push(generateCoordinate(endX, endY));
    return {
        calorie: calorie,
        odometer: odometer,
        avgSpeed: avgSpeed,
        activeTime: activeTime,
        beginTime: beginTime,
        endTime: endTime,
        isValid: isValid,
        isValidReason: isValidReason,
        stepCount: stepCount,
        pace: pace,
        minuteSpeed: minuteSpeed,
        minSpeedPerHour: minSpeedPerHour,
        maxSpeedPerHour: maxSpeedPerHour,
        avgPace: avgPace,
        lastOdometerTime: lastOdometerTime,
        stepMinute: stepMinute,
        beganPoint: beganPoint,
        endPoint: endPoint,
        coordinate: coordinate
    };
}

Java.perform(function () {

    unpinSSL();
    var data = generateData();

    Java.enumerateLoadedClasses({
        onMatch: function (name) {
            if (name.indexOf("org.json.JSONObject") >= 0) {
                var json = Java.use("org.json.JSONObject");
                json.toString.overload().implementation = function (a) {
                    var result = this.toString();
                    var parsed = JSON.parse(result);
                    if (parsed.calorie !== undefined) {
                        for (var key in data) {
                            parsed[key] = data[key];
                        }
                        console.log("Your data: " + JSON.stringify(parsed));
                        return JSON.stringify(parsed);
                    }
                    return result;
                }
            }
            if (name.indexOf("net.crigh.cgsport.model.SportBean") >= 0) {
                var sport = Java.use("net.crigh.cgsport.model.SportBean");
                sport.getCal.implementation = function () {
                    return data.calorie;
                };
                sport.getDllc.implementation = function () {
                    return data.odometer;
                };
                sport.getAvgSpeed.implementation = function () {
                    return data.avgSpeed;
                };
                sport.getMaxSpeed.implementation = function () {
                    return data.maxSpeedPerHour;
                };
                sport.getDlTime.implementation = function () {
                    return data.activeTime;
                };
                sport.getStartDate.implementation = function () {
                    return data.beginTime;
                };
                sport.getEndDate.implementation = function () {
                    return data.endTime;
                };
                sport.getStepMinute.implementation = function () {
                    return data.stepMinute;
                };
                sport.getResult.implementation = function () {
                    return 1;
                };
                sport.getIsValidReason.implementation = function () {
                    return data.isValidReason;
                };
                sport.getTotalStep.implementation = function () {
                    return data.stepCount;
                };
                sport.getMinSpeedPerHour.implementation = function () {
                    return data.minSpeedPerHour;
                };
                sport.getMaxSpeedPerHour.implementation = function () {
                    return data.maxSpeedPerHour;
                };
                sport.getAvgPace.implementation = function () {
                    return data.avgPace;
                };
                sport.getLastOdometerTime.implementation = function () {
                    return data.lastOdometerTime;
                };
            }
        },

        onComplete: function () {
        }
    });
});
