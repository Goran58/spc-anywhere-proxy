var express = require('express');
var digest = require('../lib/http-digest-client/http-digest-client');
var router = express.Router();
var config = require('../config.json');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Handle secure requests
router.get('/', function(req, res) {
    switch (req.query.page) {
        case 'status_zones':
            handleStatusZones(req, res);
            break;
        case 'status_summary':
            handleStatusSummary(req, res);
            break;
        case 'door_status':
            handleStatusDoors(req, res);
            break;
        case 'video':
            handleStatusVideo(req, res);
            break;
        case 'video_live':
            handleLiveVideo(req, res);
            break;
        case 'outputs':
            handleOutputs(req, res);
            break;
        case 'log':
            handleLogSystem(req, res);
            break;
        case 'access_log':
            handleLogAccess(req, res);
            break;
        case 'wpa_log':
            handleLogWpa(req, res);
            break;
        default:
            res.end("ERROR: Invalid paramters");
            break;
    }
});

// Convert special characters to HTML codes
function escapeHtml(str) {
    return str.replace(/[\u00A0-\u2666]/g, function(c){
                return '&#' + c.charCodeAt(0) + ';';
           });
}

// Convert Unix time to string
function getTimeString(seconds){
        var d = new Date(seconds*1000);
        var timestr = ( d.getFullYear() + '-' +
                      ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                      ('0' + d.getDate()).slice(-2) + ' ' +
                      ('0' + d.getHours()).slice(-2) + ':' +
                      ('0' + d.getMinutes()).slice(-2) + ':' +
                      ('0' + d.getSeconds()).slice(-2));
        return timestr;
}

// GET/PUT request to SPC Web Gateway
function spcWebGatewayRequest(method, request, callback) {
    var options = {
        host: config.spc_web_gw_host,
        port: config.spc_web_gw_port,
        path: request,
        method: method,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    };

    var user = '';
    var pwd  = '';
    if (method == 'GET') {
        user = config.spc_web_gw_get_user; 
        pwd  = config.spc_web_gw_get_pwd; 
    }
    else if (method == 'PUT') {
        user = config.spc_web_gw_put_user; 
        pwd  = config.spc_web_gw_put_pwd; 
    }

    var https_digest = digest.createClient(user, pwd, true);
    var spc_req = https_digest.request(options, function(spc_res){
        var data = '';
        spc_res.on('data', function (chunk) {
            data += chunk;
        });

        spc_res.on('end', function () {
            callback(data);
        });

        spc_res.on('error', function (err) {
            console.log("HTTPS_DIGEST: RES ERROR");
        });
    });
}

// Handle Status Zones
function handleStatusZones(req, res) {
    if (req.query.zone && req.query['log' + req.query.zone] == 'Log' &&
            req.query.select == 1) {
            getLogZone(req, res, req.query.zone);
    }
    else  {
        var zone_id = -1;
        for (var i = 1; i <= 128; i++) {
            if (req.query['isolate' + i] == 'Isolate') {
                zone_id = i;
                setStateZone(req, res, zone_id, 'isolate');
                break;
            }
            else if (req.query['unisolate' + i] == 'Deisolate') {
                zone_id = i;
                setStateZone(req, res, zone_id, 'deisolate');
                break;
            }
            else if (req.query['restore' + i] == 'Restore') {
                zone_id = i;
                restoreAlerts(req, res, getStatusZones);
                break;
            }
        }
        if (zone_id < 1) {
            getStatusZones(req, res);
        }
    }
}

// Handle Status Summary
function handleStatusSummary(req, res) {
    var area_id = -1;
    for (var i = 1; i <= 8; i++) {
        if (req.query['fullset' + i] || req.query['fullset0' + i]) {
           area_id = i;
           setStateArea(req, res, area_id, 'set');
           break;
        }
        else if (req.query['unset' + i] || req.query['unset0' + i]) {
           area_id = i;
           setStateArea(req, res, area_id, 'unset');
           break;
        }
        else if (req.query['parta' + i] || req.query['parta0' + i]) {
           area_id = i;
           setStateArea(req, res, area_id, 'set_a');
           break;
        }
        else if (req.query['partb' + i] || req.query['partb0' + i]) {
           area_id = i;
           setStateArea(req, res, area_id, 'set_b');
           break;
        }
    }
    var zone_id = -1;
    for (var i = 1; i <= 128; i++) {
        if (req.query['restore' + i] == 'Restore') {
            zone_id = i;
            restoreAlerts(req, res, getStatusSummary);
            break;
        }
    }
    if (area_id <= 0 && zone_id <= 0) {
        getStatusSummary(req, res);
    }
}

// Handle Status Doors
function handleStatusDoors(req, res) {
    getStatusDoors(req, res);
}

// Handle Video
function handleStatusVideo(req, res) {
    getStatusVideo(req, res);
}

// Handle System Log
function handleLiveVideo(req, res) {
    var camera = 1;
    if (req.query.camera >= 1 && req.query.camera <= 4) {
        camera = req.query.camera;
    }
    getLiveVideo(req, res, camera);
}

// Handle Status Outputs
function handleOutputs(req, res) {
    var output_id = -1;
    for (var i = 1; i <= 32; i++) {
        if (req.query['on' + ('0' + i).slice(-2)]) {
           output_id = i;
           setStateOutput(req, res, output_id, 'set');
           break;
        } else if (req.query['off' + ('0' + i).slice(-2)]) {
           output_id = i;
           setStateOutput(req, res, output_id, 'reset');
           break;
        }
    }
    if (output_id <= 0) {
        getStatusOutputs(req, res);
    }
}

// Handle System Log
function handleLogSystem(req, res) {
    getLogSystem(req, res);
}

// Handle Access Log
function handleLogAccess(req, res) {
    getLogAccess(req, res);
}

// Handle Wpa Log
function handleLogWpa(req, res) {
    getLogWpa(req, res);
}

// Get Live Video
function getLiveVideo(req, res, camera) {
    spcWebGatewayRequest('GET', '/spc/image/' + camera, function(data) {
        var image_data = JSON.parse(data);
        if (image_data.status == 'success') {
            res.setHeader('Content-Type', 'image/jpeg');
            var jpeg_data = new Buffer(image_data.data.image.data, 'base64');
            res.write(jpeg_data);
            res.end();
        }
        else {
            res.setHeader('Content-Type', 'image/jpeg');
            res.end();
        }
    });
}

// Get system eventlog
function getLogSystem(req, res) {

    spcWebGatewayRequest('GET', '/spc/systemlog/', function(data) {
        var _data = JSON.parse(data);
        var log_data = {};

        if (_data.status == 'success') {
            log_data = _data.data.systemlog.event;
            for (var i = 0; i < log_data.length; i++) {
                log_data[i].time = getTimeString(log_data[i].time);
                log_data[i].text = escapeHtml(log_data[i].text);
            }
        }
        res.render('log_system', {log_data: log_data});
   });
}

// Get access log
function getLogAccess(req, res) {
    spcWebGatewayRequest('GET', '/spc/accesslog/', function(data) {
        var _data = JSON.parse(data);
        var log_data = {};

        if (_data.status == 'success' && _data.data.accesslog.event) {
            log_data = _data.data.accesslog.event;
            for (var i = 0; i < log_data.length; i++) {
                log_data[i].time = getTimeString(log_data[i].time);
                log_data[i].text = escapeHtml(log_data[i].text);
            }
        }
        res.render('log_access', {log_data: log_data});
    });
}

// Get Wpa log
function getLogWpa(req, res) {
    var log_data = {};
    res.render('log_access', {log_data: log_data});
}

// Get eventlog for a zone
function getLogZone(req, res, zone_id) {

    var open_label   = 'Open';
    var closed_label = 'Closed';
    var input_label  = 'Input';
    var time_label   = 'Time';
    var lang = req.headers['accept-language'].substring(0,2);
    if (lang == 'sv') {
        open_label   = '&Ouml;ppen';
        closed_label = 'ST&Auml;NGD';
        input_label  =  'Ing&aring;ng';
        time_label   =  'Tid';
    }
    spcWebGatewayRequest('GET', '/spc/zonelog/' + zone_id, function(data) {
        var _data = JSON.parse(data);
        var log_data = {};

        if (_data.status == 'success') {
            log_data = _data.data.zonelog.event;
            for (var i = 0; i < log_data.length; i++) {
                if (log_data[i].input == 1) {
                    log_data[i].color = 'blue';
                    log_data[i].input = open_label;
                }
                else {
                    log_data[i].color = 'green';
                    log_data[i].input = closed_label;
                }
                log_data[i].time = getTimeString(log_data[i].time);
            }
        }
        res.render('log_zone', {log_data: log_data, input_label: input_label, time_label: time_label});
    });
}

// Get status for all zones
function getStatusZones(req, res) {
    var zone_type = [
        'Alarm',
        'Entry/Exit',
        'Exit Terminator',
        'Fire',
        'Fire Exit',
        'Line',
        'Panic',
        'Hold-up',
        'Tamper',
        'Technical',
        'Medical',
        'Keyarm',
        'Unused',
        'Shunt',
        'X-shunt',
        'Fault',
        'Lock Supervision',
        'Seismic',
        'All Okay',
        'Unknown',
        'Unknown',
        'Setting authorisation'
    ];

    var zone_input = [
        'Closed',
        'Open',
        'Short',
        'Disconnected',
        'PIR Masked',
        'DC Substitution',
        'Sensor Missing',
        'Offline'
    ];

    var zone_status = [
        'Normal',
        'Inhibit',
        'Isolate',
        'Soak',
        'Unknown',
        'Alarm'
    ];

    spcWebGatewayRequest('GET', '/spc/zone/', function(data) {
        var _data = JSON.parse(data);
        var zone_data = {};

        if (_data.status == 'success') {
            zone_data = _data.data.zone;
            for (var i = 0; i < zone_data.length; i++) {
                zone_data[i].zone_name = escapeHtml(zone_data[i].zone_name);
                zone_data[i].type = zone_type[zone_data[i].type];
                zone_data[i].input = zone_input[zone_data[i].input];
                zone_data[i].status = zone_status[zone_data[i].status];
                if (zone_data[i].input == 'Open' && 
                    zone_data[i].status == 'Normal') {
                    zone_data[i].status = 'Actuated';
                }
                if (zone_data[i].status == 'Alarm') {
                    zone_data[i].submit_value = 'Restore';
                    zone_data[i].submit_name = 'restore';
                }
                else if (zone_data[i].status == 'Isolate') {
                    zone_data[i].submit_value = 'Deisolate';
                    zone_data[i].submit_name = 'unisolate';
                }
                else {
                    zone_data[i].submit_value = 'Isolate';
                    zone_data[i].submit_name = 'isolate';
                }
            }
        }
        res.render('status_zones', {zone_data: zone_data});
    });
}

// Get status summary
function getStatusSummary(req, res) {

    var lang = req.headers['accept-language'].substring(0,2);

    var partset_a_label = 'Partset A';
    var partset_b_label = 'Partset B';
    if (lang == 'sv') {
        partset_a_label = 'Deltillkoppl. A';
        partset_b_label = 'Deltillkoppl. B';
    }
    var alarm_set    = false;

    spcWebGatewayRequest('GET', '/spc/zone/', function(data) {
        var _data = JSON.parse(data);
        var zone_data = {};

        if (_data.status == 'success') {
            zone_data = _data.data.zone;
            for (var i = 0; i < zone_data.length; i++) {
                zone_data[i].zone_name = escapeHtml(zone_data[i].zone_name);
                if (zone_data[i].status == 5 && alarm_set == false) {
                    alarm_set = true;
                }
            }
        }

        spcWebGatewayRequest('GET', '/spc/area/', function(data) {
            var _data = JSON.parse(data);
            var area_data = {};

            if (_data.status == 'success') {
                area_data = _data.data.area;
                for (var i = 0; i < area_data.length; i++) {
                    if (area_data[i].mode == 0) {
                        area_data[i].mode = 'Unset';
                        area_data[i].submit0_value = partset_a_label;
                        area_data[i].submit0_name = 'parta';
                        area_data[i].submit1_value = partset_b_label;
                        area_data[i].submit1_name = 'partb';
                        area_data[i].submit2_value = 'Fullset';
                        area_data[i].submit2_name = 'fullset';
                    }
                    else if (area_data[i].mode == 1) {
                        area_data[i].mode = partset_a_label;
                        area_data[i].submit0_value = 'Unset';
                        area_data[i].submit0_name = 'unset';
                        area_data[i].submit1_value = partset_b_label;
                        area_data[i].submit1_name = 'partb';
                        area_data[i].submit2_value = 'Fullset';
                        area_data[i].submit2_name = 'fullset';
                    }
                    else if (area_data[i].mode == 2) {
                        area_data[i].mode = partset_b_label;
                        area_data[i].submit0_value = 'Unset';
                        area_data[i].submit0_name = 'unset';
                        area_data[i].submit1_value = partset_a_label;
                        area_data[i].submit1_name = 'parta';
                        area_data[i].submit2_value = 'Fullset';
                        area_data[i].submit2_name = 'fullset';
                    }
                    else if (area_data[i].mode == 3) {
                        area_data[i].mode = 'Fullset';
                        area_data[i].submit0_value = 'Unset';
                        area_data[i].submit0_name = 'unset';
                        area_data[i].submit1_value = partset_a_label;
                        area_data[i].submit1_name = 'parta';
                        area_data[i].submit2_value = partset_b_label;
                        area_data[i].submit2_name = 'partb';
                    }
                    if (alarm_set) {
                        area_data[i].submit1_disabled = 'disabled';
                        area_data[i].submit2_disabled = 'disabled';
                    } 
                    else {
                        area_data[i].submit1_disabled = 'enabled';
                        area_data[i].submit2_disabled = 'enabled';
                    }
                }
            }
            res.render('status_summary',{area_data: area_data, zone_data: zone_data, session_id:req.query.session});
        });
    });
}

// Get status for doors
function getStatusDoors(req, res) {
    res.render('status_doors',{});
}

// Get status for video
function getStatusVideo(req, res) {
    // Expect that number of verification zones is equal number of cameras 
    // and all vzone id:s are in consequtive orders.
    spcWebGatewayRequest('GET', '/spc/vzone/', function(data) {
        var _data = JSON.parse(data);
        var num_cameras = 0;

        if (_data.status == 'success') {
            var vzone_data = _data.data.vzone;
            for (var i = 0; i < vzone_data.length; i++) {
                if (vzone_data[i].video == 1 &&  vzone_data[i].id > num_cameras) {
                    num_cameras = vzone_data[i].id;
                }
            }
            if (num_cameras > 4) num_cameras = 4;
        }
        res.render('status_video', {num_cameras: num_cameras});
    });
}

// Set output state
function setStateOutput(req, res, output_id, state) {
    spcWebGatewayRequest('PUT', '/spc/output/' + output_id + '/' + state, function(data) {
        getStatusOutputs(req, res);
    });
}

// Set zone state
function setStateZone(req, res, zone_id, state) {
    spcWebGatewayRequest('PUT', '/spc/zone/' + zone_id + '/' + state, function(data) {
           getStatusZones(req, res);
    });
}

// Restore all alerts
function restoreAlerts(req, res, next) {
    spcWebGatewayRequest('PUT', '/spc/alert/restore', function(data) {
           next(req, res);
    });
}

// Set area state
function setStateArea(req, res, area_id, state) {
    spcWebGatewayRequest('PUT', '/spc/area/' + area_id + '/' + state, function(data) {
        getStatusSummary(req, res);
    });
}

// Get status for outputs
function getStatusOutputs(req, res) {
    var output_state = [
        'off',
        'on'
    ];

    spcWebGatewayRequest('GET', '/spc/output/', function(data) {
        var _data = JSON.parse(data);
        var output_data = {};

        if (_data.status == 'success') {
            output_data = _data.data.output;
            for (var i = 0; i < output_data.length; i++) {
                output_data[i].state = output_state[output_data[i].state];
            }
        }
        res.render('status_outputs', {output_data: output_data});
    });
}

module.exports = router;
