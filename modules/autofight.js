MODULES["autofight"] = {};
//These can be changed (in the console) if you know what you're doing:
MODULES["autofight"].breedTimerCutoff1 = 2;
MODULES["autofight"].breedTimerCutoff2 = 0.5;

var skipFight = 0;
var deathsThisZone = 0;
var oldWolrdZone;
var currentWorldZone;

function betterAutoFight() {
    // So yeah, first go at an improved Autofight; it's pretty crude but handles what I want OK-ish
    var customVars = MODULES["autofight"];
    var genBreedTime = 45; // Initialize in case of fuckup
    if(typeof game.global.GeneticistassistSetting !== "undefined") genBreedTime = game.global.GeneticistassistSetting+1;
    if (game.global.autoBattle && !game.global.pauseFight) 
        pauseFight(); //Disable built-in autofight
    if (game.global.gridArray.length === 0 || game.global.preMapsActive || !game.upgrades.Battle.done) return;  //sanity check. stops error message on z1 right after portal
    if (game.global.mapsUnlocked && game.global.skipFight == 0 && game.global.lastClearedCell < 0 && game.global.world%5 == 1 && !game.global.fighting && !(game.global.mapsActive || game.global.preMapsActive)) {mapsClicked(); skipFight++; return;} // Stop killing another group after omnipotrimp if fight cycle happens before automaps
    
    var targetBreed = (game.global.spireActive ? 15 : 0); // Default instant autofighting
    var currentBreedTime = (game.jobs.Amalgamator.owned > 0) ? Math.floor((new Date().getTime() - game.global.lastSoldierSentAt) / 1000) : Math.floor(game.global.lastBreedTime / 1000);
    var newSquadRdy = false;
    
    if (game.global.universe == 2) targetBreed = 0
    else {
     if (!(game.global.world < 230 || getCurrentEnemy().name == "Liquimp")) targetBreed = (game.global.spireActive ? genBreedTime : 3); // So this is a first hot-fix to Spire instakills, as well as enforcing at least x seconds worth of breeding
    
     // Now check how many times we have died this zone and add time up to 45s total
     // Yes, this will slow me down during very high bleeds but screw it, better then die over and over because there's no geneticist bonus
     // Should also help to get at least some Anticipation attack bonus back in very high zones where I die on bleed cells
     currentWorldZone = game.global.world;
     if(typeof oldWolrdZone === "undefined") oldWolrdZone = currentWorldZone;
     if(oldWolrdZone != currentWorldZone) {
      // We beat the current zone, so reset counters
      deathsThisZone = 0;
      oldWolrdZone = currentWorldZone;
     }
     targetBreed += 2*deathsThisZone; // +2s per death
     targetBreed = (targetBreed>genBreedTime ? genBreedTime : targetBreed); // Set anything over GenBreed back down a notch
    
    } // Here ends U2 override for instant fighting
    
    // If we met targetBreed, check if we have enough trimps to not stagger breed timer too much. If soldier size is negligable, just send it anyway
    if (targetBreed <= currentBreedTime && (game.resources.trimps.owned*1.2 > game.resources.trimps.realMax() || (game.resources.trimps.maxSoldiers/game.resources.trimps.owned) < 0.01)) {
        newSquadRdy = true;
    }
    //Manually click fight instead of using builtin auto-fight
    if (!game.global.fighting) {
        if (newSquadRdy || game.global.soldierHealth > 0) {
            fightManual();
            if(deathsThisZone <= 20) deathsThisZone++; // Well, it's not ideal but close enough
        }
    skipFight = 0;
    }
}

//NEW:: 2nd algorithm for Better Auto Fight
function betterAutoFight2() {
    var customVars = MODULES["autofight"];
    if (game.global.autoBattle && !game.global.pauseFight)
        pauseFight();   //Disable built-in autofight
    if (game.global.gridArray.length === 0 || game.global.preMapsActive || !game.upgrades.Battle.done || game.global.fighting)
        return;         //sanity check.
    var targetBreed = getPageSetting('GeneticistTimer');
    if (targetBreed <= 0) {
            targetBreed = 46; // later replace with get of current in-game geneticist assist
    }
    var breeding = (game.resources.trimps.owned - game.resources.trimps.employed);
    var newSquadRdy = game.resources.trimps.realMax() <= game.resources.trimps.owned + 1;
    var adjustedMax = (game.portal.Coordinated.level) ? game.portal.Coordinated.currentSend : trimps.maxSoldiers;
    var potencyMod = getPotencyMod();
    var tps = breeding * potencyMod;
    var addTime = adjustedMax / tps;
    //if armySend is less than half of what you have breeding, and what you have breeding is more than 10% of your total trimps. (when scientist I is incompleted)
    var lowLevelFight = game.resources.trimps.maxSoldiers < 0.5*breeding && breeding > 0.1*game.resources.trimps.realMax() && game.global.world <= 6 && game.global.sLevel < 1;

    var breedTimerLimit = game.talents.patience.purchased && getPageSetting('UsePatience') ? 46 : 31;

    //Manually fight if:     //game.global.soldierHealth > 0 //just fight if we're alive,or if == 0; we're dead, and also fight :P
    if (!game.global.fighting) {
        if (game.global.soldierHealth > 0)
            battle(true); //just fight, dont speak.
        else if (newSquadRdy || lowLevelFight || game.global.challengeActive == 'Watch') {
            battle(true);
            debug("AutoFight Default: New squad ready", "other");
        }
        //Click Fight if we are dead and already have enough for our breed timer, and fighting would not add a significant amount of time
        else if (getBreedTime() < customVars.breedTimerCutoff1 && (game.global.lastBreedTime/1000) > targetBreed) {
            battle(true);
            debug("AutoFight: BAF1 #1, breed &lt; " + customVars.breedTimerCutoff1 + " &amp;&amp; HiddenNextGroup &gt; GeneTimer", "other");
        }
        //AutoFight will now send Trimps to fight if it takes less than 0.5 seconds to create a new group of soldiers, if we havent bred fully yet
        else if (getBreedTime() <= customVars.breedTimerCutoff2) {
            battle(true);
            debug("AutoFight: BAF1 #2, breed &lt;= " + customVars.breedTimerCutoff2 + " s", "other");
        }
        //Click fight anyway if we are dead and stuck in a loop due to Dimensional Generator and we can get away with adding time to it.
        else if (getBreedTime(true)+addTime <= targetBreed && breeding>=adjustedMax && !(game.global.mapsActive && getCurrentMapObject().location == "Void")) {
            battle(true);
            debug("AutoFight: NEW: BAF2 #3, RemainingTime + ArmyAdd.Time &lt; GeneTimer", "other");
        }
        //Clicks fight anyway if we are dead and have >=breedTimerLimit NextGroupTimer and deal with the consequences by firing geneticists afterwards.
        else if (game.global.soldierHealth == 0 && (game.global.lastBreedTime/1000)>=breedTimerLimit && targetBreed >= 0 && !game.jobs.Geneticist.locked && game.jobs.Geneticist.owned > 10 ) {
            battle(true);
            debug("AutoFight: NEW: BAF2 #4, NextGroupBreedTimer went over " + breedTimerLimit + " and we arent fighting.", "other");
        }
    }
}
