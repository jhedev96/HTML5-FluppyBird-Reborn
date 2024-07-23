/*!
 *   Copyright 2020 Jhe ID
 *   fluppybird - main.js
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

var gameLevel = {
    normal: 160,
    easy: 200,
    medium: 130,
    hard: 95,
    hardest: 80
};

var gameLevelMode = gameLevel.normal;
var screenMode = 'default';
var selection = [];
var debugMode = false;

var states = Object.freeze({
    SplashScreen: 0,
    GameScreen: 1,
    ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight;

var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

//sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sfx/wing.ogg");
var soundScore = new buzz.sound("assets/sfx/point.ogg");
var soundHit = new buzz.sound("assets/sfx/hit.ogg");
var soundDie = new buzz.sound("assets/sfx/die.ogg");
var soundSwoosh = new buzz.sound("assets/sfx/swooshing.ogg");
var soundFeature = new buzz.sound("assets/sfx/feature.ogg");
var soundTheme = new buzz.sound("assets/sfx/theme.ogg");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
    var ieFix = document.createElement('style')
    ieFix.appendChild(document.createTextNode('@-ms-viewport{width:auto!important}'))
    document.querySelector('head').appendChild(ieFix)
}

var init = (function() {
    var ani = anime.timeline({
        autoplay: false
    });
    ani.add({
        targets: ['.credits'],
        translateY: [1, 0],
        scale: 1,
        opacity: 1,
        easing: 'easeOutExpo',
        delay: function(element, interval, label) {
            return interval * 80
        },
        offset: '-=250'
    }).add({
        targets: '.version',
        innerHTML: parseFloat(anime.version, 10),
        duration: 2500,
        easing: 'easeOutCubic',
        begin: function(assign) {
            assign.animatables[0].target.classList.add('highlighted');
        },
        update: function(assign) {        
            var value = assign.animatables[0].target.innerHTML;
            value = parseFloat(value).toFixed(1);
            assign.animatables[0].target.innerHTML = value;
        },
        complete: function(assign) {
            assign.animatables[0].target.classList.remove('highlighted');
        },
        offset: '-=500'
    }).add({
        targets: '.date',
        innerHTML: function() { 
            var date = new Date(); 
            return date.getFullYear(); 
        },
        round: 1,
        duration: 2500,
        easing: 'easeOutCubic',
        begin: function(assign) {
            assign.animatables[0].target.classList.add('highlighted');
        },
        complete: function(assign) {
            assign.animatables[0].target.classList.remove('highlighted');
        },
        offset: '-=2000'
    })

    function play() {
        document.body.classList.add('ready');
        ani.play();
    }

    return {
        play: play
    }
})();

window.onload = function() {
    init.play();
}


//start doppler flap listening
// TODO: Merge with $(document).ready() below
window.addEventListener('load', function() {
    window.doppler.init(function(bandwidth) {
        var threshold = 4;
        if (bandwidth.left > threshold || bandwidth.right > threshold) {
            var diff = bandwidth.left - bandwidth.right;
            const clickThreshold = -10; // Tune this number for sensitivity of "flap"
            if (diff < clickThreshold) {
                //console.log(`diff: ${diff}`);
                // We need user to click a button to start the game so we are allowed to make sound.
                // Per: https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
                if (currentstate == states.SplashScreen) return;
                //in ScoreScreen, flapping motion should click the "replay" button. else it's just a regular spacebar hit
                if (currentstate == states.ScoreScreen) {
                    $("#replay").click();
                } else {
                    screenClick();
                }
            }
        }
    });
});

$(document).ready(function() {
    //get the highscore
    var savedscore = getStore("highscore");
    if (savedscore != "") highscore = parseInt(savedscore);

    //start with the splash screen
    showSplash();

    $("div#action-feature").on("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $.modal($("#feature-box"), {
            // options
        });
        sfxInit('feature');
        sfxInit('theme', 'pause');
    });
    $("a").easyTooltip();
});


/**
 * Check exitense of a cookie.
 *
 * @param String name
 * @param String value
 * @return boolean
 */
function isGameSettings(name, value) {
    if (document.cookie.split(';').filter(function(item) {
        if (typeof value === 'undefined') {
            return item.indexOf(name + '=') >= 0;
        }

        return item.indexOf(name + '=' + value) >= 0;
    }).length) {
        return true;
    }

    return false;
};

/**
 * Write cookie and set the expiration to forever. It will only write once.
 *
 * @param String name
 * @param String value
 * @param Boolean checkWithValue
 * @return void
 */
function createGameSettings(name, value, checkWithValue) {
    var currentYear = (new Date()).getFullYear() + 3;
    var expires = (new Date(currentYear, 12, 12)).toUTCString();
    document.cookie = name + '=' + value + ';path=/;expires=' + expires;
};

/**
 * Function apply function to play level game
 *
 * @return void
 */
function applyGameLevel() {
    var gameLevelOption = document.getElementsByName('level-mode');
    for (var i = 0; i < gameLevelOption.length; i++) {
        gameLevelOption[i].onclick = function(e) {
            gameLevelMode = this.value;

            createGameSettings('fluppybirdLevel', this.value);

            if (this.value === gameLevel.easy) {
                gameLevelOption[i].checked = true;
                return;
            }

            if (this.value === gameLevel.medium) {
                gameLevelOption[i].checked = true;
                return;
            }

            if (this.value === gameLevel.hard) {
                gameLevelOption[i].checked = true;
                return;
            }

            if (this.value === gameLevel.hardest && selection.length === 0) {
                return;
            }

            gameLevelOption[i].checked = false;
        }

        if (isGameSettings('fluppybirdLevel', gameLevelOption[i].value)) {
            gameLevelOption[i].checked = true;
            gameLevelMode = gameLevelOption[i].value;
        }
    }
}

/**
 * Function apply function to change screen mode
 *
 * @return void
 */
function applyScreenMode() {
    var screenModeOption = document.getElementsByName('screen-mode');
    for (var i = 0; i < screenModeOption.length; i++) {
        screenModeOption[i].onclick = function(e) {
            screenMode = this.value;

            createGameSettings('useScreenMode', this.value);

            if (this.value === 'zoom') {
                screenModeOption[i].checked = true;
                return;
            }

            if (this.value === 'full' && selection.length === 0) {
                return;
            }

            screenModeOption[i].checked = false;
        }

        if (isGameSettings('useScreenMode', screenModeOption[i].value)) {
            screenModeOption[i].checked = true;
            screenMode = screenModeOption[i].value;
        }
    }
}

/**
 * Apply city mode
 *
 * @param boolean city
 * @return void
 */
function applyCityMode(apply) {
    var cityValue = '1';

    if (apply === false) {
        cityValue = '0'
    }

    createGameSettings('useCityMode', cityValue);
}

/**
 * Apply leap motion mode
 *
 * @param boolean leap motion
 * @return void
 */
function applyLeapMotion(apply) {
    var leapMotionValue = '1';

    if (apply === false) {
        leapMotionValue = '0'
    }

    createGameSettings('useLeapMotion', leapMotionValue);
}

/**
 * Apply autopilot mode
 *
 * @param boolean autopilot
 * @return void
 */
function applyAutopilotMode(apply) {
    var autopilotValue = '1';

    if (apply === false) {
        autopilotValue = '0'
    }

    createGameSettings('useAutopilotMode', autopilotValue);
}

/**
 * Apply debug mode
 *
 * @param boolean apply
 * @return void
 */
function applyDebugMode(apply) {
    var debugValue = '1';

    if (apply === false) {
        debugValue = '0'
    }

    createGameSettings('useDebugMode', debugValue);
}

document.getElementById('debug-mode').onclick = function(e) {
    if (this.checked) {
        applyDebugMode(true);
        return;
    }

    applyDebugMode(false);
}

document.getElementById('city-mode').onclick = function(e) {
    if (this.checked) {
        applyCityMode(true);
        return;
    }

    applyCityMode(false);
}

document.getElementById('autopilot-mode').onclick = function(e) {
    if (this.checked) {
        applyAutopilotMode(true);
        return;
    }

    applyAutopilotMode(false);
}

document.getElementById('leap-motion').onclick = function(e) {
    if (this.checked) {
        applyLeapMotion(true);
        return;
    }

    applyLeapMotion(false);
}

window.document.addEventListener('DOMContentLoaded', function(e) {
    if (isGameSettings('useCityMode', '1')) {
        applyCityMode(true);
        document.getElementById('city-mode').checked = true;
        var c = document.createElement('link');
        c.type = 'text/css';
        c.href = 'css/night-city.css';
        c.rel = 'stylesheet';
        c.media = 'screen';
        var e = document.querySelector('head');
        e.appendChild(c);
    } else {
        applyCityMode(false);
        document.getElementById('city-mode').checked = false;
        var c = document.createElement('link');
        c.type = 'text/css';
        c.href = 'css/day-city.css';
        c.rel = 'stylesheet';
        c.media = 'screen';
        var e = document.querySelector('head');
        e.appendChild(c);
    }

    if (isGameSettings('useAutopilotMode', '1')) {
        applyAutopilotMode(true);
        document.getElementById('autopilot-mode').checked = true;
        autopilotInit();
    }

    if (isGameSettings('useLeapMotion', '1')) {
        applyLeapMotion(true);
        document.getElementById('leap-motion').checked = true;
        leapMotionInit();
    }

    if (isGameSettings('useDebugMode', '1')) {
        applyDebugMode(true);
        document.getElementById('debug-mode').checked = true;
        debugMode = true;
    }

    applyGameLevel();
    pipeheight = gameLevelMode;

    applyScreenMode();
    screenModeInit(screenMode);
});


function getStore(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

function setStore(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}


// Leap Motion Controls
function leapMotionInit() {
    var leap = new Leap.Controller({
        enableGestures: true
    });

    leap.connect();
    var lastGesture = new Date().getTime();
    var gestureDelay = 150; // ms
    var goneUp = true;
    leap.on('frame', function (frame) {
        now = new Date().getTime();
        if (frame.gestures.length > 0 && (now - lastGesture) > gestureDelay) {
            var gesture = frame.gestures[0];

            if (frame.hands.length > 0) {
                if ( frame.fingers.length > 2 && gesture.type === 'swipe' ) {
                    var y = gesture.direction[1];
                    if (y < 0 && goneUp) {
                        screenClick();
                        goneUp = false;
                    } else {
                        goneUp = true;
                    }
                }
                lastGesture = now;
            }
        }
    });
}

function autopilotInit() {
    var pipe_gap = 90,
        flap_thresh = 0;

    function targetHeight() {
        var p = pipes[0];
        if (p === undefined) {
            return ($('#ceiling').offset().top + $('#land').offset().top) / 2;
        }
        p = p.children('.pipe_upper');
        var result = ((p.offset().top + p.height())) + pipe_gap / 2;
        result += pipe_gap / 8;
        return result;
    }

    function currentHeight() {
        return $('#player').offset().top + $('#player').height() / 2;
    }

    window.setInterval(function() {
        if ((currentHeight() - targetHeight()) > flap_thresh) {
            $(document).mousedown();
            $(document).trigger('touchstart');
        }
    }, 20);
}

function screenModeInit(screen) {
    if (screen == 'zoom') {
        document.body.classList.add('screenZoom');
        zoom.to({
            element: document.body,
            x: 100,
            y: 200,
            width: 300,
            height: 300,
            scale: 3,
            padding: 20,
            callback: function() {
                console.log('Zoom mode is enabled')
            }
        });
    } else if (screen == 'full') {
        if (screenfull.isEnabled) {
            screenfull.request().then(function () {
                console.log('Browser entered fullscreen mode');
                console.log('Fullscreen mode: ' + (screenfull.isFullscreen ? 'enabled' : 'disabled'));
            })
        }
    } else {
        document.body.classList.remove('screenZoom');
        zoom.out({
            callback: function() {
                console.log('Zoom mode is disabled')
            }
        });
        screenfull.exit().then(function () {
            console.log('Browser exited fullscreen mode')
        });
    }
}

function sfxInit(type, action) {
    if (type == 'theme') {
        if (action == 'pause') {
            soundTheme.pause();
        } else {
            soundTheme.stop().loop().play().padeIn();
        }
    } else if (type == 'feature') {
        if (action == 'pause') {
            soundFeature.pause();
        } else {
            soundFeature.stop().loop().play().padeIn();
        }
    }
}

        
function sfxTheme() {
    soundTheme.stop()
    .loop()
    .play()
    .fadeIn();
}

function sfxFeature() {
    soundFeature.stop()
    .loop()
    .play()
    .fadeIn();
}

function showSplash() {
    currentstate = states.SplashScreen;

    //set the defaults (again)
    velocity = 0;
    position = 180;
    rotation = 0;
    score = 0;

    //update the player in preparation for the next game
    $("#player").css({
        y: 0,
        x: 0
    });
    updatePlayer($("#player"));

    soundSwoosh.stop();
    soundSwoosh.play();

    //clear out all the pipes if there are any
    $(".pipe").remove();
    pipes = new Array();

    //make everything animated again
    $(".animated").css('animation-play-state', 'running');
    $(".animated").css('-webkit-animation-play-state', 'running');

    //fade in the splash
    $("#splash").transition({
        opacity: 1
    }, 2000, 'ease');

    sfxInit('theme');
}

function startGame() {
    currentstate = states.GameScreen;

    //fade out the splash
    $("#splash").stop();
    $("#splash").transition({
        opacity: 0
    }, 500, 'ease');

    //update the big score
    setBigScore();

    //debug mode?
    if (debugMode) {
        //show the bounding boxes
        $(".boundingbox").show();
    }

    //start up our loops
    var updaterate = 1000.0 / 60.0 ; //60 times a second
    loopGameloop = setInterval(gameloop, updaterate);
    loopPipeloop = setInterval(updatePipes, 1400);

    //jump from the start!
    playerJump();
}

function updatePlayer(player) {
    //rotation
    rotation = Math.min((velocity / 10) * 90, 90);

    //apply rotation and position
    $(player).css({
        rotate: rotation,
        top: position
    });
}

function gameloop() {
    var player = $("#player");

    //update the player speed/position
    velocity += gravity;
    position += velocity;

    //update the player
    updatePlayer(player);

    //create the bounding box
    var box = document.getElementById('player').getBoundingClientRect();
    var origwidth = 34.0;
    var origheight = 24.0;

    var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
    var boxheight = (origheight + box.height) / 2;
    var boxleft = ((box.width - boxwidth) / 2) + box.left;
    var boxtop = ((box.height - boxheight) / 2) + box.top;
    var boxright = boxleft + boxwidth;
    var boxbottom = boxtop + boxheight;

    //if we're in debug mode, draw the bounding box
    if (debugMode) {
        var boundingbox = $("#playerbox");
        boundingbox.css('left', boxleft);
        boundingbox.css('top', boxtop);
        boundingbox.css('height', boxheight);
        boundingbox.css('width', boxwidth);
    }

    //did we hit the ground?
    if (box.bottom >= $("#land").offset().top) {
        playerDead();
        return;
    }

    //have they tried to escape through the ceiling? :o
    var ceiling = $("#ceiling");
    if (boxtop <= (ceiling.offset().top + ceiling.height())) position = 0;

    //we can't go any further without a pipe
    if (pipes[0] == null) return;

    //determine the bounding box of the next pipes inner area
    var nextpipe = pipes[0];
    var nextpipeupper = nextpipe.children(".pipe_upper");

    var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
    var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
    var piperight = pipeleft + pipewidth;
    var pipebottom = pipetop + pipeheight;

    if (debugMode) {
        var boundingbox = $("#pipebox");
        boundingbox.css('left', pipeleft);
        boundingbox.css('top', pipetop);
        boundingbox.css('height', pipeheight);
        boundingbox.css('width', pipewidth);
    }

    //have we gotten inside the pipe yet?
    if (boxright > pipeleft) {
        //we're within the pipe, have we passed between upper and lower pipes?
        if (boxtop > pipetop && boxbottom < pipebottom) {
            //yeah! we're within bounds

        } else {
            //no! we touched the pipe
            playerDead();
            return;
        }
    }


    //have we passed the imminent danger?
    if (boxleft > piperight) {
        //yes, remove it
        pipes.splice(0, 1);

        //and score a point
        playerScore();
    }
}

//Handle space bar
$(document).keydown(function(e) {
    //space bar!
    if (e.keyCode == 32) {
        //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
        if (currentstate == states.ScoreScreen) {
            $("#replay").click();
        } else {
            screenClick();
        }
    }
});

//Handle mouse down OR touch start
if ("ontouchstart" in window) {
   $(document).on("touchstart", screenClick);
} else {
   $(document).on("mousedown", screenClick);
}

function screenClick() {
    if (currentstate == states.GameScreen) {
        playerJump();
    } else if (currentstate == states.SplashScreen) {
        startGame();
    }
}

function playerJump() {
    velocity = jump;
    //play jump sound
    soundJump.stop();
    soundJump.play();
}

function setBigScore(erase) {
    var elemscore = $("#bigscore");
    elemscore.empty();

    if (erase) return;

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++) {
        elemscore.append("<img src='assets/img/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
    }
}

function setSmallScore() {
    var elemscore = $("#currentscore");
    elemscore.empty();

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++) {
        elemscore.append("<img src='assets/img/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
    }
}

function setHighScore() {
    var elemscore = $("#highscore");
    elemscore.empty();

    var digits = highscore.toString().split('');
    for (var i = 0; i < digits.length; i++) {
        elemscore.append("<img src='assets/img/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
    }
}

function setMedal() {
    var elemmedal = $("#medal");
    elemmedal.empty();

    if (score < 10) {
        //signal that no medal has been won
        return false;
    }

    if (score >= 10) medal = "bronze";
    if (score >= 20) medal = "silver";
    if (score >= 30) medal = "gold";
    if (score >= 40) medal = "platinum";

    elemmedal.append('<img src="assets/img/medal_' + medal +'.png" alt="' + medal +'">');

    //signal that a medal has been won
    return true;
}

function playerDead() {
    //stop animating everything!
    $(".animated").css('animation-play-state', 'paused');
    $(".animated").css('-webkit-animation-play-state', 'paused');

    //drop the bird to the floor
    var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
    var floor = flyArea;
    var movey = Math.max(0, floor - playerbottom);
    $("#player").transition({
        y: movey + 'px',
        rotate: 90
    }, 1000, 'easeInOutCubic');

    //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
    currentstate = states.ScoreScreen;

    //destroy our gameloops
    clearInterval(loopGameloop);
    clearInterval(loopPipeloop);
    loopGameloop = null;
    loopPipeloop = null;

    //mobile browsers don't support buzz bindOnce event
    if (isIncompatible.any()) {
        //skip right to showing score
        showScore();
    } else {
        //play the hit sound (then the dead sound) and then show score
        soundHit.play().bindOnce("ended", function() {
            soundDie.play().bindOnce("ended", function() {
                showScore();
                sfxInit('theme');
            });
        });
    }

    sfxInit('theme');
}

function showScore() {
    //unhide us
    $("#scoreboard").css("display", "block");

    //remove the big score
    setBigScore(true);

    //have they beaten their high score?
    if (score > highscore) {
        //yeah!
        highscore = score;
        //save it!
        setStore("highscore", highscore, 999);
    }

    //update the scoreboard
    setSmallScore();
    setHighScore();
    var wonmedal = setMedal();

    //SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();

    //show the scoreboard
    $("#scoreboard").css({
        y: '40px',
        opacity: 0
    }); //move it down so we can slide it up
    $("#replay").css({
        y: '40px',
        opacity: 0
    });
    $("#scoreboard").transition({
        y: '0px',
        opacity: 1
    }, 600, 'ease', function() {
        //When the animation is done, animate in the replay button and SWOOSH!
        soundSwoosh.stop();
        soundSwoosh.play();

        sfxInit('theme');
        $("#replay").transition({
            y: '0px',
            opacity: 1
        }, 600, 'ease');

        //also animate in the MEDAL! WOO!
        if (wonmedal) {
            $("#medal").css({
                scale: 2,
                opacity: 0
            });
            $("#medal").transition({
                opacity: 1,
                scale: 1
            }, 1200, 'ease');
        }
    });

    //make the replay button clickable
    replayclickable = true;
}

$("#replay").click(function() {
    //make sure we can only click once
    if (!replayclickable) {
        return;
    } else {
        replayclickable = false;
    }
    //SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();

    //fade out the scoreboard
    $("#scoreboard").transition({
        y: '-40px',
        opacity: 0
    }, 1000, 'ease', function() {
        //when that's done, display us back to nothing
        $("#scoreboard").css("display", "none");

        //start the game over!
        showSplash();
    });
});

function playerScore() {
    score += 1;
    //play score sound
    soundScore.stop();
    soundScore.play();
    setBigScore();
}

function updatePipes() {
    //Do any pipes need removal?
    $(".pipe").filter(function() {
        return $(this).position().left <= -100;
    }).remove()

    //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
    var padding = 80;
    var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
    var topheight = Math.floor((Math.random() * constraint) + padding); //add lower padding
    var bottomheight = (flyArea - pipeheight) - topheight;
    var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
    $("#flyarea").append(newpipe);
    pipes.push(newpipe);
}

var isIncompatible = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Safari: function() {
        return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
    }
};