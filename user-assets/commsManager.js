var CommsManager = (function () {
    function CommsManager() {
        var _this = this;
        window.plugins.notify.receiveInboxChanges('', function (r, message) { return _this.processInboxChange(r, message); });
        window.plugins.notify.receiveOutboxChanges('', function (r, message) { return _this.processMessageResponse(r, message); });
    }
    CommsManager.prototype.updateQueue = function (queue) {
        window.cti.store.messageQueue = queue;
    };
    CommsManager.prototype.getQueue = function () {
        if (window.cti.store.messageQueue !== undefined)
            return window.cti.store.messageQueue;
        else
            return [];
    };
    CommsManager.prototype.getMessageQueueCount = function () {
        return this.messageQueue.length;
    };
    CommsManager.prototype.addToQueue = function (message) {
        this.messageQueue = this.getQueue();
        message.payload.commsManagerId = this.generateUUID();
        this.messageQueue.push(message);
        this.updateQueue(this.messageQueue);
    };
    CommsManager.prototype.sendMessage = function (endpoint, message) {
        var messageCount = this.getMessageQueueCount();
        console.log('SENDING MESSAGE to: %s. Remaining messages on device: %s', endpoint, messageCount);
        message.payload.appVersion = window.cti.store.schema.metadata.version;
        if (endpoint == 'sendEvidence' && message.payload.EvidenceType !== 'jobSignature') {
            var messageQueue = this.messageQueue;
            window.resolveLocalFileSystemURL(message.payload.photoRef, function (entry) {
                var options = {
                    "name": "azureEtfService",
                    "operation": endpoint,
                    "params": {
                        "payload": message.payload,
                        "photoRef": message.payload.photoRef
                    },
                };
                if (message.actions !== undefined)
                    options.actions = message.actions;
                window.cti.utils.callAction('call-azure-app-service', options);
            }, function () {
                var index;
                var res = window.jQuery.grep(messageQueue, function (e, i) {
                    var result = e.payload.commsManagerId === message.payload.commsManagerId;
                    if (result)
                        index = i;
                    return result;
                });
                if (res.length > 0) {
                    var jobId = res[0].payload.JobId;
                    var jobMsgResults = window.jQuery.grep(messageQueue, function (e, i) {
                        return (e.payload.Id === jobId);
                    });
                    if (jobMsgResults.length > 0) {
                        if (jobMsgResults[0].payload.failPhoto === undefined)
                            jobMsgResults[0].payload.failPhoto = [res[0].payload.fileName];
                        else
                            jobMsgResults[0].payload.failPhoto.push(res[0].payload.fileName);
                    }
                    messageQueue.splice(index, 1);
                    window.commsManager.processQueue();
                }
            });
        }
        else {
            // If it's the last UpdateJob message, pass the details of the jobs to unlock for this user and request the latest jobs for that same neighbourhood
            if (endpoint == 'updateJob' && messageCount == 1) {
                // Add list of locked jobs
                // Server will need to include the jobs that is the subject of this request to unlock too - only if we submit successfully though of course
                // Add neighbourhood to request jobs for
                // We'll be looking to re-populate window.cti.store.azureAppServices.azureEtfService.getJobs within the response handler
                message.payload.lockedJobs = this.getLockedJobs(message.payload.JobRef);
                // Only flag the request for a job list refresh from the server if there are no pending responses for jobs we have locally, in which case
                // we want to leave them intact and do nothing.
                message.payload.lockedJobs.requireJobListRefresh = !message.payload.lockedJobs.pendingResponses;
                // We need to get the neighbourhood and job type switch too
                message.payload.lockedJobs.neighbourhood = window.cti.store.currentPatch;
                message.payload.lockedJobs.allJobs = window.cti.store.getAllJobs;

                // We destroy the list of pending jobs now because if the call partially fails, we could have unlocked jobs on the device available for processing
                if (message.payload.lockedJobs.requireJobListRefresh) {
                    // I've removed pre-clearing the job list because it's a much worse experience when we find out we're offline and end up with no jobs
                    // and no ability to retrieve any more. It does leave the vulnerability where the unlock fails server-side, but it's hard to defend against
                    // whilst still keeping a decent offline experience.
                    //window.cti.store.azureAppServices.azureEtfService.getJobs = [];
                }
            }
            var options = {
                "name": "azureEtfService",
                "operation": endpoint,
                "params": {
                    "payload": message.payload
                }
            };
            if (message.actions !== undefined)
                options.actions = message.actions;
            window.cti.utils.callAction('call-azure-app-service', options);
        }
    };
    CommsManager.prototype.getLockedJobs = function (ignoreJobRef) {
        var result = {
            ignoreJob: ignoreJobRef,
            pendingResponses: false,
            jobRefs: [],
            pendingJobs: []
        };
        if (window.cti.store.completedJobs !== undefined) {
            for (var i = 0; i < window.cti.store.completedJobs.length; i++) {
                // If we've asked for a job to be ignored (maybe in the case where it's a job we're about to submit so will track it server-side), ignore it here
                if (window.cti.store.completedJobs[i].responseReceived !== true && (ignoreJobRef === undefined || ignoreJobRef != window.cti.store.completedJobs[i].JobRef)) {
                    result.pendingJobs.push(window.cti.store.completedJobs[i].JobRef)
                    result.pendingResponses = true;
                }
            }
        }

        // If there are no pending responses, we can safely request the unlocking of all of the jobs we have on device and get a new list from the server
        if (!result.pendingResponses) {
            // Build ID list of jobs to be unlocked
            for (var i = 0; i < window.cti.store.azureAppServices.azureEtfService.getJobs.length; i++) {
                result.jobRefs.push(window.cti.store.azureAppServices.azureEtfService.getJobs[i].JobRef)
            }
        }
        return result;
    };
    CommsManager.prototype.processQueue = function () {
        this.messageQueue = this.getQueue();
        if (this.messageQueue.length > 0)
            this.sendMessage(this.messageQueue[0].endpoint, this.messageQueue[0]);
        else {
            window.cti.stopSpinner();
            /*
            var loader = document.getElementsByTagName('activity-loader')[0];
            if (loader !== undefined)
                loader.hide();
            */
        }
    };
    CommsManager.prototype.processMessageResponse = function (err, message) {
        this.messageQueue = this.getQueue();
        this.updateQueue(this.messageQueue);
        //var loader = document.getElementsByTagName('activity-loader')[0];
        if (message.action.indexOf('FAIL') > -1) {
            if (window.localStorage['reconciling'] === "true") {
                delete window.localStorage['reconciling'];
                window.cti.cancelPopup('popReconcileFail');
            }
            console.log(message.action + ': ' + JSON.stringify(message.message));
            window.cti.stopSpinner();
            /*
            if (loader !== undefined)
                loader.hide();
            */
        }
        else {
            // We have an updated sync
            var dt = new Date();
            window.cti.store.lastSync = dt;
            window.cti.store.lastSyncDisplay = window.cti.fnFormatDate(dt, '(not yet synced)');

            if (this.messageQueue.length > 0) {
                var messageId = message.message.content.data.payload.commsManagerId;
                console.log('Processing response for message: %s', messageId);
                var res = window.jQuery.grep(this.messageQueue, function (e) {
                    return (e.payload.commsManagerId === messageId);
                });
                if (res.length > 0) {
                    for (var r = 0; r < res.length; r++) {
                        for (var i = 0; i < this.messageQueue.length; i++) {
                            if (this.messageQueue[i].payload.commsManagerId == res[r].payload.commsManagerId) {
                                if (this.messageQueue[i].endpoint === 'sendEvidence' && this.messageQueue[i].payload.EvidenceType === 'jobPhoto') {
                                    console.log('Evidence response received');
                                    var photoRef = this.messageQueue[i].payload.photoRef;
                                    window.cti.store.messageQueue.splice(i, 1);
                                    window.commsManager.updateQueue(window.cti.store.messageQueue);
                                    var currIndex = i;
                                    this.deleteFile(photoRef, currIndex, function (err, index) {
                                        if (err)
                                            console.log(err);
                                        else {
                                            if (window.cti.store.messageQueue.length > 0)
                                                window.commsManager.processQueue();
                                        }
                                    });
                                }
                                else {
                                    if (this.messageQueue[i].endpoint === 'updateJob') {
                                        var jobs = window.cti.store.completedJobs;
                                        for (var j = 0; j < jobs.length; j++) {
                                            if (jobs[j].JobRef === this.messageQueue[i].payload.JobRef)
                                                jobs[j].responseReceived = true;
                                        }
                                    }
                                    if (this.messageQueue[i].actions !== undefined) {
                                        var msg = this.messageQueue[i];
                                        if (msg.logout === false) {
                                            window.cti.utils.callAction(msg.actions[0].type, msg.actions[0].data);
                                        }
                                        else {
                                            window.plugins.zumo.logout(function () {
                                                delete window.localStorage['logoutInitiated'];
                                                window.cti.utils.callAction(msg.actions[0].type, msg.actions[0].data);
                                            }, function (r) { console.log(r); });
                                        }
                                    }
                                    this.messageQueue.splice(i, 1);
                                    this.updateQueue(this.messageQueue);
                                    if (this.messageQueue.length > 0)
                                        this.processQueue();
                                }
                            }
                        }
                    }
                }
                if (window.localStorage['reconciling'] == "true") {
                    var completedReconciling = this.checkIfReconcileIsComplete();
                    if (completedReconciling) {
                        delete window.localStorage['reconciling'];
                        window.cti.stopSpinner();
                        /*
                        if (loader !== undefined)
                            loader.hide();
                        */
                        window.cti.cancelPopup('popReconcileSuccess');
                    }
                }
                window.cti.stopSpinner();
                /*
                if (loader !== undefined)
                    loader.hide();
                */
            }
        }
    };
    CommsManager.prototype.processInboxChange = function (err, message) {
        if (message !== undefined)
            if (message.message !== undefined)
                if (message.message.content !== undefined) {
                    // Note: There seems to be an issue if we drop offline that responses previously received for messages will keep on getting
                    // delivered here. I've pu a workaround in place to track the request IDs of messages and ignore any that we've already seen
                    if (message.message.content.reqId !== undefined) {
                        var thisRequestId = message.message.content.reqId;
                        var maxTrackingQueueLength = 500;
                        if (window.cti.store.processedResponses === undefined) {
                            window.cti.store.processedResponses = [];
                        }

                        if (window.cti.store.processedResponses.indexOf(thisRequestId) > -1) {
                            // response is already there - don't do anything
                            console.log("DEBUG:: Ignore previously processed message response: " + thisRequestId);
                            return;
                        }
                        window.cti.store.processedResponses.push(thisRequestId);
                        if (window.cti.store.processedResponses.length > maxTrackingQueueLength) {
                            window.cti.store.processedResponses.splice(0, window.cti.store.processedResponses.length - maxTrackingQueueLength);
                        }
                    }

                    if (message.message.content.config !== undefined)
                        if (message.message.content.config.transport !== undefined)
                            if (message.message.content.config.transport.api === 'updateJob') {
                                // In the response, we could have  newJobStatus and newJobs
                                //  newJobStatus = we tried to refresh the job list for this user: 0 = no jobs avilale, 1 = jobs match previous list, 2 = job list has changed
                                //  newJobs[] = array of jobs as per above, assign these as the active job list
                                var newJobStatus = message.message.content.response.newJobStatus;
                                if (newJobStatus !== undefined) {
                                    window.cti.store.azureAppServices.azureEtfService.getJobs = message.message.content.response.newJobs;
                                    // Add in the display friendly SLA dates for the revised job list
                                    for(var i = 0; i < window.cti.store.azureAppServices.azureEtfService.getJobs.length; i++) {
                                        if (window.cti.store.azureAppServices.azureEtfService.getJobs[i].SLADisplay === undefined) {
                                            window.cti.store.azureAppServices.azureEtfService.getJobs[i].SLADisplay = window.cti.fnFormatDate(window.cti.store.azureAppServices.azureEtfService.getJobs[i].SLA, '(none)');
                                        }
                                    }

                                    // And generate an action to show a notification if the job list is different or empty...
                                    if (newJobStatus == 0) {
                                        window.cti.utils.callAction('show-notification', { 'name': 'jobRefreshEmpty' });
                                    }
                                    else if (newJobStatus == 2) {
                                        window.cti.utils.callAction('show-notification', { 'name': 'jobRefresh' });
                                    }
                                }

                            }
                            else
                            if (message.message.content.config.transport.api === 'getNeighbourhoodDropdown') {
                                console.log('Setting neighbourhood dropdown');
                                var dropdownRes = message.message.content.response.res;
                                if (window.cti.store.azureAppServices.azureEtfService === undefined) {
                                    window.cti.store.azureAppServices.azureEtfService = {
                                        getNeighbourhoodDropdown: {
                                            res: dropdownRes
                                        }
                                    };
                                }
                                else {
                                    window.cti.store.azureAppServices.azureEtfService.getNeighbourhoodDropdown = {
                                        res: dropdownRes
                                    };
                                }
                            }
                }
    };
    CommsManager.prototype.checkIfReconcileIsComplete = function () {
        var remainingJobs = true;
        for (var i = 0; i < window.cti.store.completedJobs.length; i++) {
            if (window.cti.store.completedJobs[i].responseReceived !== true) {
                remainingJobs = false;
                break;
            }
        }
        return remainingJobs;
    };
    CommsManager.prototype.deleteFile = function (filePath, currIndex, callback) {
        var myFolderApp = 'my_folder';
        function fileSystemError(err) {
            console.log(err);
            callback(err);
        }
        window.resolveLocalFileSystemURL(filePath, function (entry) {
            entry.remove(function () {
                console.log('File deleted: %s', filePath);
                callback(false, currIndex);
            }, fileSystemError);
        }, fileSystemError);
    };
    CommsManager.prototype.generateUUID = function () {
        var d = new Date().getTime();
        if (window.performance && typeof window.performance.now === "function") {
            d += performance.now();
        }
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };
    return CommsManager;
}());
function initialiseCommsManager() {
    window.commsManager = new CommsManager();
    window.checkJobDetailsPage();
    window.updateReasonButton();
    window.resetMessageQueue();
    window.monitorJobsSLAs();
}
document.removeEventListener('deviceready', initialiseCommsManager);
document.addEventListener('deviceready', initialiseCommsManager);
