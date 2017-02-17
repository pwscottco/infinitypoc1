// Reset view logic on job details page
function checkJobDetailsPage() {
    setTimeout(function() {
        if(cti.store.state.currentPage === 'JobDetail') {
            if(cti.store.currentJob.ArrivalTime === null) {
                $('div#btnArrive').attr('classes', '');
                $('div#btnComplete').attr('classes', 'ng-hide');
            }
            else {
                $('div#btnArrive').attr('classes', 'ng-hide');
                $('div#btnComplete').attr('classes', '');
            }
        }

        if(window.commsManager == undefined) {
            window.commsManager = new CommsManager();
        }
    }, 1000);
}

function updateReasonButton() {
    setTimeout(function() {
        if(cti.store.state.currentPage === 'FailJob') {
            if(cti.store.currentJob.Reason !== null) {
                document.querySelector('a#btnSelectReason').textContent = cti.store.currentJob.Reason;
            }
        }
    }, 1000);
}

function resetMessageQueue() {
    setTimeout(function() {
        cti.store.messageQueue = [];
    }, 1000)
}

function showStatusBar() {
    StatusBar.show();
    StatusBar.styleLightContent();
    StatusBar.backgroundColorByHexString("#3E788F");
    plugin.statusBarOverlay.show();
}

function monitorJobsSLAs() {
    if (window.hMonitorJobSLAs !== undefined) {
        clearInterval(window.hMonitorJobSLAs);
        window.hMonitorJobSLAs = undefined;
    }
    // Every 30 seconds, we'll check if there's a job list displayed on page and flag and up that are close to
    // reaching SLA
    window.hMonitorJobSLAs = setInterval(function () {
        var slaItems = document.getElementsByClassName("sla");
        for (var i = 0; i < slaItems.length; i++) {
            var slaDateStr = slaItems[i].getAttribute("data-sla");
            if (slaDateStr != null) {
                var newClassNames = "sla";
                var msg = "";
                var msgOk = "(met)";
                var slaDate = new Date(slaDateStr);
                var compareDate;
                var isComplete = false;

                var completionDateStr = slaItems[i].getAttribute("data-completion-date");
                if (completionDateStr != null && completionDateStr != "null" && completionDateStr != "") {
                    compareDate = new Date(completionDateStr);
                    isComplete = true;
                }
                else {
                    compareDate = new Date();
                    var slaThreshhold = 48;
                    var slaThreshholdStr = slaItems[i].getAttribute("data-sla-threshhold");
                    if (slaThreshholdStr != null && slaThreshholdStr != "null" && slaThreshholdStr != "") {
                        slaThreshhold = parseInt(slaThreshholdStr);
                    }
                    slaThreshholdCalc = slaThreshhold * 60;
                    msgOk = " (<" + slaThreshhold + "hrs)";
                }

                var diff = slaDate - compareDate;
                var numberHours = Math.floor((diff / 1000) / 60);
                if (numberHours < 1) {
                    newClassNames = 'sla sla-fail';
                    msg = " (failed)";
                }
                else if (isComplete) {
                    msg = msgOk;
                }
                else if (numberHours < slaThreshholdCalc) {
                    newClassNames = 'sla sla-warn';
                    msg = msgOk;
                }
                if (slaItems[i].className != newClassNames) {
                    console.log("DEBUG:: Update classes for SLA element");
                    slaItems[i].className = newClassNames;
                    var msgElements = slaItems[i].getElementsByClassName("sla-message");
                    if (msgElements != null && msgElements.length > 0) {
                        msgElements[0].innerHTML = msg;
                    }
                }
            }
        }

    }, 4000);
}

document.removeEventListener('deviceready', showStatusBar);
document.addEventListener('deviceready', showStatusBar);
