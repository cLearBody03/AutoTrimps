//Initialize the saved data objects, and load data/grab from browser if found.
var allSaveData = [];
var graphData = [];
var tmpGraphData = JSON.parse(localStorage.getItem('allSaveData'));
if (tmpGraphData !== null) {
    console.log('Got allSaveData. Yay!');
    allSaveData = tmpGraphData;
}

//Import the Chart Libraries
var head = document.getElementsByTagName('head')[0];
var chartscript = document.createElement('script');
chartscript.type = 'text/javascript';
chartscript.src = 'https://code.highcharts.com/highcharts.js';
head.appendChild(chartscript);

//Create the graph button and div
var newItem = document.createElement("TD");
newItem.appendChild(document.createTextNode("Graphs"));
newItem.setAttribute("class", "btn btn-default");
newItem.setAttribute("onclick", "autoToggleGraph(); drawGraph();");
var settingbarRow = document.getElementById("settingsTable").firstElementChild.firstElementChild;
settingbarRow.insertBefore(newItem, settingbarRow.childNodes[10]);
document.getElementById("settingsRow").innerHTML += '<div id="graphParent" style="display: none; height: 600px; overflow: auto;"><div id="graph" style="margin-bottom: 10px;margin-top: 5px; height: 530px;"></div>';
document.getElementById("graphParent").innerHTML += '<div id="graphFooter" style="height: 50px;font-size: 1em;"><div id="graphFooterLine1" style="display: -webkit-flex;flex: 0.75;flex-direction: row; height:30px;"></div><div id="graphFooterLine2"></div></div>';
//Create the buttons in the graph Footer:
//Create the dropdown for what graph to show    (these correspond to headings in setGraph() and have to match)
var graphList = ['Radon - Rn/Hr', 'Radon - Total', 'Scruffy XP', 'Fluffy XP', 'Scruffy XP PerHour', 'Fluffy XP PerHour', 'RnHr % / LifetimeHe', 'Rn % / LifetimeHe', 'HeliumPerHour', 'Helium', 'HeHr % / LifetimeHe', 'He % / LifetimeHe', 'Clear Time', 'Cumulative Clear Time', 'Run Time', 'Map Bonus', 'Void Maps', 'Void Map History', 'Trimps', 'Nullifium Gained', 'OverkillCells'];
var btn = document.createElement("select");
btn.id = 'graphSelection';
//btn.setAttribute("style", "");
btn.setAttribute("onmouseover", 'tooltip(\"Graph\", \"customText\", event, \"What graph would you like to display?\")');
btn.setAttribute("onmouseout", 'tooltip("hide")');
btn.setAttribute("onchange", "setGraphData(document.getElementById('graphSelection').value)");
for (var item in graphList) {
    var option = document.createElement("option");
    option.value = graphList[item];
    option.text = graphList[item];
    btn.appendChild(option);
}
document.getElementById('graphFooterLine1').appendChild(btn);
//just write it in HTML instead of a million lines of DOM javascript.
document.getElementById("graphFooterLine1").innerHTML += '\
<div><button onclick="drawGraph()">Refresh</button></div>\
<div style="flex:0 100 5%;"></div>\
<div><input type="checkbox" id="clrChkbox" onclick="toggleClearButton();"></div>\
<div style="margin-left: 0.5vw;"><button id="clrAllDataBtn" onclick="clearData(null,true); drawGraph();" class="btn" disabled="" style="flex:auto; padding: 2px 6px;border: 1px solid white;">Clear All Previous Data</button></div>\
<div style="flex:0 100 5%;"></div>\
<div style="flex:0 2 3.5vw;"><input style="width:100%;min-width: 40px;" id="deleteSpecificTextBox"></div>\
<div style="flex:auto; margin-left: 0.5vw;"><button onclick="deleteSpecific(); drawGraph();">Delete Specific Portal</button></div>\
<div style="flex:0 100 5%;"></div>\
<div style="flex:auto;"><button  onclick="GraphsImportExportTooltip(\'ExportGraphs\', null, \'update\')">Export your Graph Database</button></div>\
<div style="float:right; margin-right: 0.5vw;"><button onclick="toggleSpecificGraphs()">Invert Selection</button></div>\
<div style="float:right; margin-right: 1vw;"><button onclick="toggleAllGraphs()">All Off/On</button></div>';
document.getElementById("graphFooterLine2").innerHTML += '\
<span style="float: left;" onmouseover=\'tooltip(\"Tips\", \"customText\", event, \"You can zoom by dragging a box around an area. You can turn portals off by clicking them on the legend. Quickly view the last portal by clicking it off, then Invert Selection. Or by clicking All Off, then clicking the portal on. To delete a portal, Type its portal number in the box and press Delete Specific. Using negative numbers in the Delete Specific box will KEEP that many portals (starting counting backwards from the current one), ie: if you have Portals 1000-1015, typing -10 will keep 1005-1015. Export Graph Database will make a backup of all the graph data (not that useful yet). There is a browser data storage limitation of 10MB, so do not exceed 15 portals-worth of data.\")\'>Tips: Hover for usage tips.</span>\
<input style="height: 20px; float: right; margin-right: 0.5vw;" type="checkbox" id="rememberCB">\
<span style="float: right; margin-right: 0.5vw;">Try to Remember Which Portals are Selected when switching between Graphs:</span>';
//handle the locking mechanism checkbox for the Clear all previous data button:
function toggleClearButton() {
    document.getElementById('clrAllDataBtn').disabled=!document.getElementById('clrChkbox').checked;
}
//anonymous self-executing function that runs once on startup to color the graph footer elements Black, unless we are in Dark theme.
(function() {
    var items = document.getElementById("graphFooterLine1").children;
    for (var i=0,len=items.length; i<len; i++) {
        if(game.options.menu.darkTheme.enabled != 2) {
            var oldstyle = items[i].getAttribute("style");
            if (oldstyle == null) oldstyle="";
            items[i].setAttribute("style",oldstyle + "color:black;");
        }
    }
})();

function GraphsImportExportTooltip(what, isItIn, event) {
    if (game.global.lockTooltip)
        return;
    var elem = document.getElementById("tooltipDiv");
    swapClass("tooltipExtra", "tooltipExtraNone", elem);
    var ondisplay = null; // if non-null, called after the tooltip is displayed
    var tooltipText;
    var costText = "";
    if (what == "ExportGraphs"){
        tooltipText = "This is your GRAPH DATABASE save string. There are many like it but this one is yours. Save this save somewhere safe so you can save time next time. <br/><br/><textarea id='exportArea' style='width: 100%' rows='5'>" + JSON.stringify(allSaveData) + "</textarea>";
        costText = "<div class='maxCenter'><div id='confirmTooltipBtn' class='btn btn-info' onclick='cancelTooltip()'>Got it</div>";
        if (document.queryCommandSupported('copy')){
            costText += "<div id='clipBoardBtn' class='btn btn-success'>Copy to Clipboard</div>";
            ondisplay = function(){
                document.getElementById('exportArea').select();
                document.getElementById('clipBoardBtn').addEventListener('click', function(event) {
                    document.getElementById('exportArea').select();
                      try {
                        document.execCommand('copy');
                      } catch (err) {
                        document.getElementById('clipBoardBtn').innerHTML = "Error, not copied";
                      }
                });
            };
        }
        else {
            ondisplay = function(){
                document.getElementById('exportArea').select();
            };
        }
        costText += "</div>";
    }
    if (what == "ImportGraphs"){
        //runs the loadGraphs() function.
        tooltipText = "Replaces your GRAPH DATABASE with this save string! It'll be fine, I promise.<br/><br/><textarea id='importBox' style='width: 100%' rows='5'></textarea>";
        costText="<div class='maxCenter'><div id='confirmTooltipBtn' class='btn btn-info' onclick='cancelTooltip(); loadGraphs();'>Import</div><div class='btn btn-info' onclick='cancelTooltip()'>Cancel</div></div>";
        ondisplay = function () {
            document.getElementById('importBox').focus();
        };
    }
    if (what == "AppendGraphs"){
        //runs the appendGraphs() function.
        tooltipText = "Appends to your GRAPH DATABASE with this save string (combines them)! It'll be fine, I hope.<br/><br/><textarea id='importBox' style='width: 100%' rows='5'></textarea>";
        costText="<div class='maxCenter'><div id='confirmTooltipBtn' class='btn btn-info' onclick='cancelTooltip(); appendGraphs();'>Import</div><div class='btn btn-info' onclick='cancelTooltip()'>Cancel</div></div>";
        ondisplay = function () {
            document.getElementById('importBox').focus();
        };
    }
    game.global.lockTooltip = true;
    elem.style.left = "33.75%";
    elem.style.top = "25%";
    document.getElementById("tipTitle").innerHTML = what;
    document.getElementById("tipText").innerHTML = tooltipText;
    document.getElementById("tipCost").innerHTML = costText;
    elem.style.display = "block";
    if (ondisplay !== null)
        ondisplay();
}

//function to take the text string, and use it to load and overwrite your saved data (for graphs)
function loadGraphs() {
    var thestring = document.getElementById("importBox").value.replace(/(\r\n|\n|\r|\s)/gm,"");
    var tmpset = JSON.parse(thestring);
    if (tmpset == null)
        return;
    //should have done more error checking with at least an error message.
    allSaveData = tmpset;
    //refresh
    drawGraph();
}

//function to take the text string, and use it to load and append your saved data (for graphs) to the old database
function appendGraphs() {
    //currently overwrites:
    /*
    var thestring = document.getElementById("importBox").value.replace(/(\r\n|\n|\r|\s)/gm,"");
    var tmpset = JSON.parse(thestring);
    if (tmpset == null)
        return;
    //should have done more error checking with at least an error message.
    allSaveData = tmpset;
    */
    //refresh
    drawGraph();
}

// for rememberCB
var rememberSelectedVisible = [];
function saveSelectedGraphs() {
    rememberSelectedVisible = [];
    for (var i=0; i < chart1.series.length; i++){
        var run = chart1.series[i];
        rememberSelectedVisible[i] = run.visible;
    }
}

function applyRememberedSelections() {
    for (var i=0; i < chart1.series.length; i++){
        var run = chart1.series[i];
        if (rememberSelectedVisible[i] == false)
            run.hide();
    }
}

//Invert graph selections
function toggleSpecificGraphs() {
    for (var i=0; i < chart1.series.length; i++){
        var run = chart1.series[i];
        if (run.visible)
            run.hide();
        else
            run.show();
    }
}

//Turn all graphs on/off (to the opposite of which one we are closer to)
function toggleAllGraphs() {
    var count = 0;
    for (var i=0; i < chart1.series.length; i++){
        var run = chart1.series[i];
        if (run.visible)
            count++;
    }
    for (var i=0; i < chart1.series.length; i++){
        var run = chart1.series[i];
        if (count > chart1.series.length/2)
            run.hide();
        else
            run.show();
    }
}

function clearData(portal,clrall) {
    //clear data of runs with portalnumbers prior than X (15) away from current portal number. (or 0 = clear all)
    if(!portal)
        portal = 0;
    if (!clrall) {
        while(allSaveData[0].totalPortals < (game.global.totalPortals + game.global.totalRadPortals) - portal) {
            allSaveData.shift();
        }
    } else {
        while(allSaveData[0].totalPortals != (game.global.totalPortals + game.global.totalRadPortals)) {
            allSaveData.shift();
        }
    }
}

//delete a specific portal number's graphs. use negative numbers to keep that many portals.
function deleteSpecific() {
    var txtboxvalue = document.getElementById('deleteSpecificTextBox').value;
    if (txtboxvalue == "")
        return;
    if (parseInt(txtboxvalue) < 0) {
        clearData(Math.abs(txtboxvalue));
    } else {
        for (var i = allSaveData.length-1; i >= 0; i--) {
            if (allSaveData[i].totalPortals == txtboxvalue)
                allSaveData.splice(i, 1);
        }
    }
}

function autoToggleGraph() {
    if (game.options.displayed) toggleSettingsMenu();
    var aset = document.getElementById('autoSettings');
    if (aset) {
        if (aset.style.display === 'block') aset.style.display = 'none';
    }
    var item = document.getElementById('graphParent');
    if (item.style.display === 'block') item.style.display = 'none';
    else {
        item.style.display = 'block';
        setGraph();
    }
}

//unused: hides graph and shows Trimps (not AT) settings menu
function autoPlusGraphMenu() {
    var item = document.getElementById('graphParent');
    if (item.style.display === 'block') item.style.display = 'none';
    toggleSettingsMenu();
}

var chart1;
function setGraph(title, xTitle, yTitle, valueSuffix, formatter, series, yType) {
    chart1 = new Highcharts.Chart({
        chart: {
            renderTo: 'graph',
            zoomType: 'xy',
            //move reset button out of the way.
            resetZoomButton: {
                position: {
                    align: 'right',
                    verticalAlign: 'top',
                    x: -20,
                    y: 15
                },
                relativeTo: 'chart'
            }
        },
        title: {
            text: title,
            x: -20 //center
        },
        plotOptions: {
            series: {
                lineWidth: 1,
                animation: false,
                marker: {
                    enabled: false
                }
            }
        },
        xAxis: {
            floor: 1,
            title: {
                text: xTitle
            },
        },
        yAxis: {
            title: {
                text: yTitle
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }],
            type: yType,
            dateTimeLabelFormats: { //force all formats to be hour:minute:second
            second: '%H:%M:%S',
            minute: '%H:%M:%S',
            hour: '%H:%M:%S',
            day: '%H:%M:%S',
            week: '%H:%M:%S',
            month: '%H:%M:%S',
            year: '%H:%M:%S'
        }
        },
        tooltip: {
            pointFormatter: formatter,
            valueSuffix: valueSuffix
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        series: series
    });
}

function setColor(tmp) {
    for (var i in tmp) {
        if (i == tmp.length - 1) {
            tmp[i].color = '#FF0000'; //Current run is in red
        } else {
            tmp[i].color = '#90C3D4'; //Old runs are in blue
        }
    }
    return tmp;
}

function pushData() {
    debug('Starting Zone ' + game.global.world,"general");
    //helium/hour % of totalHE, and currentRun/totalLifetime HE or Ra
    var getPercent = (game.stats.heliumHour.value() / (game.global.totalHeliumEarned - (game.global.heliumLeftover + game.resources.helium.owned)))*100;
    var lifetime = (game.resources.helium.owned / (game.global.totalHeliumEarned-game.resources.helium.owned))*100;
    var RgetPercent = (game.stats.heliumHour.value() / (game.global.totalRadonEarned - (game.global.radonLeftover + game.resources.radon.owned)))*100;
	var Rlifetime = (game.resources.radon.owned / (game.global.totalRadonEarned-game.resources.radon.owned))*100;

    allSaveData.push({
        totalPortals: (game.global.totalPortals + game.global.totalRadPortals),
        heliumOwned: game.resources.helium.owned,
        currentTime: new Date().getTime(),
        portalTime: game.global.portalTime,
        world: game.global.world,
        challenge: game.global.challengeActive,
        voids: game.global.totalVoidMaps,
        heirlooms: {"value": game.stats.totalHeirlooms.value, "valueTotal":game.stats.totalHeirlooms.valueTotal},
        nullifium: recycleAllExtraHeirlooms(true),
        trimps: game.resources.trimps.realMax(),
        hehr: getPercent.toFixed(4),
        helife: lifetime.toFixed(4),
        overkill: GraphsVars.OVKcellsInWorld,
        zonetime: GraphsVars.ZoneStartTime,
        mapbonus: GraphsVars.MapBonus,
        fluffy: game.global.fluffyExp,
        scruffy: game.global.fluffyExp2,
        radonOwned: game.resources.radon.owned,
        rnhr: RgetPercent.toFixed(4),
        rnlife: Rlifetime.toFixed(4)
    });
    //only keep 15 portals worth of runs to prevent filling storage
    clearData(15);
    try {
        localStorage.setItem('allSaveData', JSON.stringify(allSaveData));
    } catch(e) {
      if (e.code == 22) {
        // Storage full, maybe notify user or do some clean-up
        debug("Error: LocalStorage is full, or error. Attempt to delete some portals from your graph or restart browser.");
      }
    }
}

function initializeData() {
    //initialize fresh with a blank array if needed
    if (allSaveData === null) {
        allSaveData = [];
    }
    //fill the array with the first data point
    if (allSaveData.length === 0) {
        pushData();
    }
}

var GraphsVars = {};
function InitGraphsVars() {
    GraphsVars.currentPortal = 0;
    GraphsVars.OVKcellsInWorld = 0;
    GraphsVars.lastOVKcellsInWorld = 0;
    GraphsVars.currentworld = 0;
    GraphsVars.lastrunworld = 0;
    GraphsVars.aWholeNewWorld = false;
    GraphsVars.lastZoneStartTime = 0;
    GraphsVars.ZoneStartTime = 0;
    GraphsVars.MapBonus = 0;
    GraphsVars.aWholeNewPortal = 0;
    GraphsVars.currentPortal = 0;
}
InitGraphsVars();

//main function of the graphs script - runs every second.
function gatherInfo() {
    //dont push updates if the game is paused. fix import on pause Clear Time problem
    if (game.options.menu.pauseGame.enabled) return;
    //make sure data structures are ready
    initializeData();
    //Track portal.
    GraphsVars.aWholeNewPortal = GraphsVars.currentPortal != (game.global.totalPortals + game.global.totalRadPortals);
    if (GraphsVars.aWholeNewPortal) {
        GraphsVars.currentPortal = (game.global.totalPortals + game.global.totalRadPortals);
        //clear filtered loot data upon portaling. < 5 check to hopefully throw out bone portal shenanigans
        filteredLoot = {
            'produced': {metal: 0, wood: 0, food: 0, gems: 0},
            'looted': {metal: 0, wood: 0, food: 0, gems: 0}
        }
    }
    //Track zone.
    GraphsVars.aWholeNewWorld = GraphsVars.currentworld != game.global.world;
    if (GraphsVars.aWholeNewWorld) {
        GraphsVars.currentworld = game.global.world;
        //if we have reached a new zone, push a new data point (main)
        if (allSaveData.length > 0 && allSaveData[allSaveData.length - 1].world != game.global.world) {
            pushData();
        }
        //reset stuff,prepare tracking variables.
        GraphsVars.OVKcellsInWorld = 0;
        GraphsVars.ZoneStartTime = 0;
        GraphsVars.MapBonus = 0;
    }

    //track how many overkill world cells we have beaten in the current level. (game.stats.cellsOverkilled.value for the entire run)
    if (game.options.menu.overkillColor.enabled == 0) toggleSetting('overkillColor');   //make sure the setting is on.
    GraphsVars.OVKcellsInWorld = document.getElementById("grid").getElementsByClassName("cellColorOverkill").length;
    //track time in each zone for better graphs
    GraphsVars.ZoneStartTime = new Date().getTime() - game.global.zoneStarted;
    //track mapbonus
    GraphsVars.MapBonus = game.global.mapBonus;
}

var dataBase = {}
var databaseIndexEntry = {
    Index: 0,
    Portal: 0,
    Challenge: 0,
    World: 0
}
var databaseDirtyEntry = {
    State: false,
    Reason: "",
    Index: -1
}
var portalExistsArray = [];
var portalRunArray = [];
var portalRunIndex = 0;

function chkdsk() {
    rebuildDataIndex();
    checkIndexConsistency();
    checkWorldSequentiality();
    if (databaseDirtyEntry.State == true) {
        //
    }

}

function rebuildDataIndex() {
    for (var i = 0; i < allSaveData.length-1;  i++) {
        //database
        dataBase[i] ={
            Index: i,
            Portal: allSaveData[i].totalPortals,
            Challenge: allSaveData[i].challenge,
            World: allSaveData[i].world
        }
        //reverse lookup quickArray
        portalRunArray.push({Index: i, Portal: allSaveData[i].totalPortals , Challenge: allSaveData[i].challenge});

        if (typeof portalExistsArray[allSaveData[i].totalPortals] == "undefined")
            portalExistsArray[allSaveData[i].totalPortals] = {Exists: true, Row: portalRunIndex, Index: i, Challenge: allSaveData[i].challenge};
        else {
            databaseDirtyFlag.State = true;
            databaseDirtyFlag.Reason = 'oreoportal';
            databaseDirtyFlag.Index = i;
            row = portalExistsArray[allSaveData[i].totalPortals].Row;
        }
        portalRunIndex++;
    }
}

function checkIndexConsistency() {
    for (var i = 0; i < dataBase.length-1;  i++) {
        if (dataBase[i].Index != i) {
            databaseDirtyFlag = [true,'index',i];
            break;
        }
    }
}

function checkWorldSequentiality() {
    var lastworld,currentworld,nextworld;
    for (var i = 1; i < dataBase.length-1;  i++) {
        lastworldEntry = dataBase[i-1];
        currentworldEntry = dataBase[i];
        nextworldEntry = dataBase[i+1];
        lastworld = lastworldEntry.World;
        currentworld = currentworldEntry.World;
        nextworld = nextworldEntry.World
        if (lastworld > currentworld && currentworld != 1) {
            databaseDirtyFlag.State = true;
            databaseDirtyFlag.Reason = 'descending';
            databaseDirtyFlag.Index = i;
            break;
        }
        if (lastworld > currentworld && currentworld == 1 && lastworld == nextworld) {
            databaseDirtyFlag.State = true;
            databaseDirtyFlag.Reason = 'badportal';
            databaseDirtyFlag.Index = i;
            break;
        }
    }
}

function drawGraph() {
    setGraphData(document.getElementById('graphSelection').value);
}

//////////////////////////////////////
//MAIN GRAPHING FUNCTION - the meat.//
//////////////////////////////////////
function setGraphData(graph) {
    var title, xTitle, yTitle, yType, valueSuffix, series, formatter;
    var precision = 0;
    var oldData = JSON.stringify(graphData);
    valueSuffix = '';

    switch (graph) {
        case 'Run Time':
            var currentPortal = -1;
            var theChallenge = '';
            graphData = [];
            for (var i in allSaveData) {
                if (allSaveData[i].totalPortals != currentPortal) {
                    if(currentPortal == -1) {
                        theChallenge = allSaveData[i].challenge;
                        currentPortal = allSaveData[i].totalPortals;
                        graphData.push({
                        name: 'Run Time',
                        data: [],
                        type: 'column'
                    });
                        continue;
                    }
                    var theOne = allSaveData[i-1];
                    var runTime = theOne.currentTime - theOne.portalTime;
                    graphData[0].data.push([theOne.totalPortals, runTime]);
                    theChallenge = allSaveData[i].challenge;
                    currentPortal = allSaveData[i].totalPortals;
                }
            }
            title = 'Total Run Time';
            xTitle = 'Portal';
            yTitle = 'Time';
            yType = 'datetime';
            formatter =  function () {
                var ser = this.series;
                return '<span style="color:' + ser.color + '" >●</span> ' +
                        ser.name + ': <b>' +
                        Highcharts.dateFormat('%H:%M:%S', this.y) + '</b><br>';

            };
            break;

        case 'Void Maps':
            var currentPortal = -1;
            var totalVoids = 0;
            var theChallenge = '';
            graphData = [];
            for (var i in allSaveData) {
                if (allSaveData[i].totalPortals != currentPortal) {
                    if(currentPortal == -1) {
                        theChallenge = allSaveData[i].challenge;
                        currentPortal = allSaveData[i].totalPortals;
                        graphData.push({
                        name: 'Void Maps',
                        data: [],
                        type: 'column'
                    });
                        continue;
                    }
                    graphData[0].data.push([allSaveData[i-1].totalPortals, totalVoids]);
                    theChallenge = allSaveData[i].challenge;
                    totalVoids = 0;
                    currentPortal = allSaveData[i].totalPortals;
                }
                if(allSaveData[i].voids > totalVoids) {
                     totalVoids = allSaveData[i].voids;
                 }
            }
            title = 'Void Maps Per Portal';
            xTitle = 'Portal';
            yTitle = 'Void Maps';
            yType = 'Linear';
            break;

        case 'Nullifium Gained':
            var currentPortal = -1;
            var totalNull = 0;
            var theChallenge = '';
            graphData = [];
            var averagenulli = 0;
            var sumnulli = 0;
            var count = 0;
            for (var i in allSaveData) {
                if (allSaveData[i].totalPortals != currentPortal) {
                    if(currentPortal == -1) {
                        theChallenge = allSaveData[i].challenge;
                        currentPortal = allSaveData[i].totalPortals;
                        graphData.push({
                        name: 'Nullifium Gained',
                        data: [],
                        type: 'column'
                    });
                        continue;
                    }
                    graphData[0].data.push([allSaveData[i-1].totalPortals, totalNull]);
                    count++;
                    sumnulli += totalNull;
                    //console.log("nulli was: " + totalNull + " " + count + " @ " + allSaveData[i].totalPortals);   //debug
                    theChallenge = allSaveData[i].challenge;
                    totalNull = 0;
                    currentPortal = allSaveData[i].totalPortals;

                }
                if(allSaveData[i].nullifium > totalNull) {
                    totalNull = allSaveData[i].nullifium;
                }
            }
            averagenulli = sumnulli / count;
            //console.log("Average nulli was: " + averagenulli);
            title = 'Nullifium Gained Per Portal';
            if (averagenulli)
                title = "Average " + title + " = " + averagenulli;
            xTitle = 'Portal';
            yTitle = 'Nullifium Gained';
            yType = 'Linear';
            break;


        //all use the same function: allPurposeGraph()
        case 'Clear Time #2':
            graphData = allPurposeGraph('cleartime2',true,null,
                    function specialCalc(e1,e2) {
                        return Math.round(e1.zonetime/1000);
                    });
            title = '(#2) Time to Clear Zone';
            xTitle = 'Zone';
            yTitle = 'Clear Time';
            yType = 'Linear';
            valueSuffix = ' Seconds';
            break;
        case 'Clear Time':
            graphData = allPurposeGraph('cleartime1',true,null,
                    function specialCalc(e1,e2) {
                        return Math.round(((e1.currentTime - e2.currentTime)-(e1.portalTime - e2.portalTime)) / 1000);
                    });
            title = 'Time to clear zone';
            xTitle = 'Zone';
            yTitle = 'Clear Time';
            yType = 'Linear';
            valueSuffix = ' Seconds';
            break;
        case 'Cumulative Clear Time #2':
            graphData = allPurposeGraph('cumucleartime2',true,null,
                    function specialCalc(e1,e2) {
                        return Math.round(e1.zonetime);
                    },true);
            title = '(#2) Cumulative Time at END of zone#';
            xTitle = 'Zone';
            yTitle = 'Cumulative Clear Time';
            yType = 'datetime';
            formatter =  function () {
                var ser = this.series;
                return '<span style="color:' + ser.color + '" >●</span> ' +
                        ser.name + ': <b>' +
                        Highcharts.dateFormat('%H:%M:%S', this.y) + '</b><br>';

            };
            break;
        case 'Cumulative Clear Time':
            graphData = allPurposeGraph('cumucleartime1',true,null,
                    function specialCalc(e1,e2) {
                        return Math.round((e1.currentTime - e2.currentTime)-(e1.portalTime - e2.portalTime));
                    },true);
            title = 'Cumulative Time at END of zone#';
            xTitle = 'Zone';
            yTitle = 'Cumulative Clear Time';
            yType = 'datetime';
            formatter =  function () {
                var ser = this.series;
                return '<span style="color:' + ser.color + '" >●</span> ' +
                        ser.name + ': <b>' +
                        Highcharts.dateFormat('%H:%M:%S', this.y) + '</b><br>';

            };
            break;
        case 'HeliumPerHour':
            graphData = allPurposeGraph('heliumhr',true,null,
                    function specialCalc(e1,e2) {
                        return Math.floor(e1.heliumOwned / ((e1.currentTime - e1.portalTime) / 3600000));
                    });
            title = 'Helium/Hour (Cumulative)';
            xTitle = 'Zone';
            yTitle = 'Helium/Hour';
            yType = 'Linear';
            break;
        case 'Helium':
            graphData = allPurposeGraph('heliumOwned',true,null,
                    function specialCalc(e1,e2) {
                        return Math.floor(e1.heliumOwned);
                    });
            title = 'Helium (earned)';
            xTitle = 'Zone';
            yTitle = 'Helium';
            yType = 'Linear';
            break;
        case 'HeHr % / LifetimeHe':
            graphData = allPurposeGraph('hehr',true,"string");
            title = 'He/Hr % of LifetimeHe';
            xTitle = 'Zone';
            yTitle = 'He/Hr % of LifetimeHe';
            yType = 'Linear';
            precision = 4;
            break;
        case 'He % / LifetimeHe':
            graphData = allPurposeGraph('helife',true,"string");
            title = 'He % of LifetimeHe';
            xTitle = 'Zone';
            yTitle = 'He % of LifetimeHe';
            yType = 'Linear';
            precision = 4;
            break;
        case 'Void Map History':
            graphData = allPurposeGraph('voids',true,"number");
            title = 'Void Map History (voids finished during the same level acquired (with RunNewVoids) are not counted/tracked)';
            xTitle = 'Zone';
            yTitle = 'Number of Void Maps';
            yType = 'Linear';
            break;
        case 'Map Bonus':
            graphData = allPurposeGraph('mapbonus',true,"number");
            title = 'Map Bonus History';
            xTitle = 'Zone';
            yTitle = 'Map Bonus Stacks';
            yType = 'Linear';
            break;
        case 'Trimps':
            graphData = allPurposeGraph('trimps',true,"number");
            title = 'Total Trimps Owned';
            xTitle = 'Zone';
            yTitle = 'Cumulative Number of Trimps';
            yType = 'Linear';
            break;
        case 'OverkillCells':
            var currentPortal = -1;
            graphData = [];
            for (var i in allSaveData) {
                if (allSaveData[i].totalPortals != currentPortal) {
                    graphData.push({
                        name: 'Portal ' + allSaveData[i].totalPortals + ': ' + allSaveData[i].challenge,
                        data: []
                    });
                    currentPortal = allSaveData[i].totalPortals;
                    if(allSaveData[i].world == 1 && currentZone != -1 )
                        graphData[graphData.length -1].data.push(0);

                    if(currentZone == -1 || allSaveData[i].world != 1) {
                        var loop = allSaveData[i].world;
                        while (loop > 0) {
                            graphData[graphData.length -1].data.push(0);
                            loop--;
                        }
                    }
                }
                if(currentZone < allSaveData[i].world && currentZone != -1) {
                    var num;
                    if (typeof allSaveData[i].overkill == "object")
                        num = allSaveData[i].overkill[1];
                    else if (typeof allSaveData[i].overkill == "number")
                        num = allSaveData[i].overkill;
                    if (num)
                        graphData[graphData.length - 1].data.push(num);
                }
                currentZone = allSaveData[i].world;
            }
            title = 'Overkilled Cells';
            xTitle = 'Zone';
            yTitle = 'Overkilled Cells';
            yType = 'Linear';
            break;
        case 'Radon - Rn/Hr':
            graphData = allPurposeGraph('radonhr', true, null,
                function specialCalc(e1, e2) {
                    return Math.floor(e1.radonOwned / ((e1.currentTime - e1.portalTime) / 3600000));
                });
            title = 'Radon/Hour (Cumulative)';
            xTitle = 'Zone';
            yTitle = 'Radon/Hour';
            yType = 'Linear';
            yminFloor = 0;
            precision = 2;
            break;
        case 'Radon - Total':
            graphData = allPurposeGraph('radonOwned', true, null,
                function specialCalc(e1, e2) {
                    return Math.floor(e1.radonOwned);
                });
            title = 'Radon (Lifetime Total)';
            xTitle = 'Zone';
            yTitle = 'Radon';
            yType = 'Linear';
            break;
        case 'RnHr % / LifetimeHe':
            graphData = allPurposeGraph('rnhr', true, "string");
            title = 'Rn/Hr % of LifetimeHe';
            xTitle = 'Zone';
            yTitle = 'Rn/Hr % of LifetimeHe';
            yType = 'Linear';
            precision = 4;
            break;
        case 'Rn % / LifetimeHe':
            graphData = allPurposeGraph('rnlife', true, "string");
            title = 'Rn % of LifetimeRn';
            xTitle = 'Zone';
            yTitle = 'Rn % of LifetimeRn';
            yType = 'Linear';
            precision = 4;
			break;
		case 'Fluffy XP':
            graphData = allPurposeGraph('fluffy', true, "number");
            title = 'Fluffy XP (Lifetime Total)';
            xTitle = 'Zone (starts at 300)';
            yTitle = 'Fluffy XP';
            yType = 'Linear';
            xminFloor = 300;
            break;
        case 'Fluffy XP PerHour':
            var currentPortal = -1;
            var currentZone = -1;
            var startFluffy = 0;
            graphData = [];
            for (var i in allSaveData) {
                if (allSaveData[i].totalPortals != currentPortal) {
                    graphData.push({
                        name: 'Portal ' + allSaveData[i].totalPortals + ': ' + allSaveData[i].challenge,
                        data: []
                    });
                    currentPortal = allSaveData[i].totalPortals;
                    currentZone = 0;
                    startFluffy = allSaveData[i].fluffy;
                }
                    if (currentZone != allSaveData[i].world - 1 && i > 0) {
                        var loop = allSaveData[i].world - 1 - currentZone;
                        while (loop > 0) {
                            graphData[graphData.length - 1].data.push(allSaveData[i-1][item]*1);
                            loop--;
                        }
                    }
                if (currentZone != 0) {
                    graphData[graphData.length - 1].data.push(Math.floor((allSaveData[i].fluffy - startFluffy) / ((allSaveData[i].currentTime - allSaveData[i].portalTime) / 3600000)));
                }
                currentZone = allSaveData[i].world;
            }
            title = 'Fluffy XP/Hour (Cumulative)';
            xTitle = 'Zone';
            yTitle = 'Fluffy XP/Hour';
            yType = 'Linear';
            xminFloor = 1;
            break;
        case 'Scruffy XP':
            graphData = allPurposeGraph('scruffy', true, "number");
            title = 'Scruffy XP (Lifetime Total)';
            xTitle = 'Zone (starts at 300)';
            yTitle = 'Scruffy XP';
            yType = 'Linear';
            xminFloor = 300;
            break;
        case 'Scruffy XP PerHour':
            var currentPortal = -1;
            var currentZone = -1;
            var startScruffy = 0;
            graphData = [];
            for (var i in allSaveData) {
                if (allSaveData[i].totalPortals != currentPortal) {
                    graphData.push({
                        name: 'Portal ' + allSaveData[i].totalPortals + ': ' + allSaveData[i].challenge,
                        data: []
                    });
                    currentPortal = allSaveData[i].totalPortals;
                    currentZone = 0;
                    startScruffy = allSaveData[i].scruffy;
                }
                    if (currentZone != allSaveData[i].world - 1 && i > 0) {
                        var loop = allSaveData[i].world - 1 - currentZone;
                        while (loop > 0) {
                            graphData[graphData.length - 1].data.push(allSaveData[i-1][item]*1);
                            loop--;
                        }
                    }
                if (currentZone != 0) {
                    graphData[graphData.length - 1].data.push(Math.floor((allSaveData[i].scruffy - startScruffy) / ((allSaveData[i].currentTime - allSaveData[i].portalTime) / 3600000)));
                }
                currentZone = allSaveData[i].world;
            }
            title = 'Scruffy XP/Hour (Cumulative)';
            xTitle = 'Zone';
            yTitle = 'Scruffy XP/Hour';
            yType = 'Linear';
            xminFloor = 1;
			break;
    }

    //default function used to draw non-specific graphs (and some specific ones)
    function allPurposeGraph(item,extraChecks,typeCheck,funcToRun,useAccumulator) {
        var currentPortal = -1;
        var currentZone = 0;
        var accumulator = 0;
        graphData = [];
        //begin iterating:
        for (var i in allSaveData) {
            //acts as an "exists" check (for lack of data)
            if (typeCheck && typeof allSaveData[i][item] != typeCheck)
                continue;
            if (allSaveData[i].totalPortals != currentPortal) {
                graphData.push({
                    name: 'Portal ' + allSaveData[i].totalPortals + ': ' + allSaveData[i].challenge,
                    data: []
                });
                currentPortal = allSaveData[i].totalPortals;
                currentZone = 0;
                if (funcToRun) {
                    accumulator = 0;
                    //push a 0 to index 0 so that clear times line up with x-axis numbers
                    graphData[graphData.length -1].data.push(0);
                }
            }
            //runs extra checks for mid-run imports, and pushes 0's to align to the right zone properly.
            if (extraChecks) {
                if (currentZone != allSaveData[i].world - 1) {
                    var loop = allSaveData[i].world - 1 - currentZone;
                    while (loop > 0) {
                        graphData[graphData.length - 1].data.push(0);
                        loop--;
                    }
                }
            }
            //write datapoint (one of 3 ways)
            if (funcToRun && !useAccumulator && currentZone != 0) {
                var num = funcToRun(allSaveData[i],allSaveData[i-1]);
                if (num < 0) num = 1;
                graphData[graphData.length - 1].data.push(num);
            }
            else if (funcToRun && useAccumulator && currentZone != 0) {
                accumulator += funcToRun(allSaveData[i],allSaveData[i-1]);
                if (accumulator < 0) accumulator = 1;
                graphData[graphData.length - 1].data.push(accumulator);
            }
            else {
                if (allSaveData[i][item] >= 0)
                    graphData[graphData.length - 1].data.push(allSaveData[i][item]*1);
                else
                    graphData[graphData.length - 1].data.push(-1);
            }
            currentZone = allSaveData[i].world;
        }
        return graphData;
    }
    //default formatter used (can define a decimal precision, and a suffix)
    formatter = formatter || function () {
        var ser = this.series;
        return '<span style="color:' + ser.color + '" >●</span> ' +
                ser.name + ': <b>' +
                Highcharts.numberFormat(this.y, precision,'.', ',') + valueSuffix + '</b><br>';
    };
    //Makes everything happen.
    if (oldData != JSON.stringify(graphData)) {
        saveSelectedGraphs();
        setGraph(title, xTitle, yTitle, valueSuffix, formatter, graphData, yType);
    }

    //remember what we had (de)selected, if desired.
    if (document.getElementById('rememberCB').checked) {
        applyRememberedSelections();
    }
}

function lookUpZoneData(zone,portal) {
    if (portal == null)
        portal = (game.global.totalPortals + game.global.totalRadPortals);
    for (var i=allSaveData.length-1,end=0; i >= 0; i--) {
        if (allSaveData[i].totalPortals != portal) continue;
        if (allSaveData[i].world != zone) continue;
        return allSaveData[i];
    }
}
//run the main gatherInfo function 1 time every second
setInterval(gatherInfo, 100);
