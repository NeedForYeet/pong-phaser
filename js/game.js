// The game properties object that currently only contains the screen dimensions
var gameProperties = {
    screenWidth: 640,
    screenHeight: 480,

    dashSize: 5, // spacing of the dotted vertical line separating the fields

    // position of the paddles inside the game world.
    // +50 and -50 from the maximum width, so they don't remain at the wall
    paddleLeft_x: 50,
    paddleRight_x: 590,
    paddleVelocity: 600,

    // paddle segments and the bounce-off angle
    paddleSegmentsMax: 4,
    paddleSegmentHeight: 4,
    paddleSegmentAngle: 15,
    paddleTopGap: 22, // original pong-like gap on top

    // ball will start with a fixed velocity and in one of four directions
    ballVelocity: 500, // in pixels per second
    ballStartDelay: 2, // in seconds
    ballRandomStartingAngleLeft: [-120, 120],
    ballRandomStartingAngleRight: [-60, 60],
    ballVelocityIncrement: 25,
    ballReturnCount: 4,

    scoreToWin: 11
};

var graphicAssets = {
    ballURL: 'assets/ball.png',
    ballName: 'ball',

    paddleURL: 'assets/paddle.png',
    paddleName: 'paddle'
};

var soundAssets = {
    ballBounceURL: 'assets/ballBounce',
    ballBounceName: 'ballBounce',

    ballHitURL: 'assets/ballHit',
    ballHitName: 'ballHit',

    ballMissedURL: 'assets/ballMissed',
    ballMissedName: 'ballMissed',

    mp4URL: '.m4a',
    oggURL: '.ogg'
};

var fontAssets = {
    scoreLeft_x: gameProperties.screenWidth * 0.25,
    scoreRight_x: gameProperties.screenWidth * 0.75,
    scoreTop_y: 10,

    scoreFontStyle: {font: '80px Arial', fill: '#FFFFFF', align: 'center'},
    instructionsFontStyle: {font: '24px Arial', fill: '#FFFFFF', align: 'center'}
};

var labels = {
    demoInstructions: 'Left paddle: A to move up, Z to move down.\n\nRight paddle: UP and DOWN arrow keys.\n\n- click to start -',
    winner: 'Winner!'
};

var mainState = function (game) {
    this.backgroundGraphics; // dotted vertical line separating the fields
    this.ballSprite;
    this.paddleLeftSprite;
    this.paddleRightSprite;
    this.paddleGroup;

    this.paddleLeft_up;
    this.paddleLeft_down;
    this.paddleRight_up;
    this.paddleRight_down;

    this.missedSide;

    this.scoreLeft;
    this.scoreRight;

    this.tf_scoreLeft;
    this.tf_scoreRight;

    this.sndBallHit;
    this.sndBallBounce;
    this.sndBallMissed;

    this.instructions;
    this.winnerLeft;
    this.winnerRight;

    this.ballVelocity;
};

// The main state that contains our game. Think of states like pages or screens such as the splash screen, main menu, game screen, high scores, inventory, etc.
mainState.prototype = {

    // The preload function is use to load assets into the game
    preload: function () {
        game.load.image(graphicAssets.ballName, graphicAssets.ballURL);
        game.load.image(graphicAssets.paddleName, graphicAssets.paddleURL);

        // Load both, mp4 and ogg files. used for different browsers
        // First argument is the unique asset name, second is the url. Combine the URL with the appropriate file ending.
        game.load.audio(soundAssets.ballBounceName, [soundAssets.ballBounceURL + soundAssets.mp4URL, soundAssets.ballBounceURL + soundAssets.oggURL]);
        game.load.audio(soundAssets.ballHitName, [soundAssets.ballHitURL + soundAssets.mp4URL, soundAssets.ballHitURL + soundAssets.oggURL]);
        game.load.audio(soundAssets.ballMissedName, [soundAssets.ballMissedURL + soundAssets.mp4URL, soundAssets.ballMissedURL + soundAssets.oggURL]);
    },

    // The create function is called after all assets are loaded and ready for use. This is where we add all our sprites, sounds, levels, text, etc.
    create: function () {
        this.initGraphics();
        this.initPhysics();
        this.initKeyboard();
        this.initSounds();
        this.startDemo();
    },

    // The update function is run every frame. The default frame rate is 60 frames per second, so the update function is run 60 times per second
    update: function () {
        this.moveLeftPaddle();
        this.moveRightPaddle();
        game.physics.arcade.overlap(this.ballSprite, this.paddleGroup, this.collideWithPaddle, null, this);

        // play bounce sound when ball bounces off walls
        if (this.ballSprite.body.blocked.up || this.ballSprite.body.blocked.down
            || this.ballSprite.body.blocked.left || this.ballSprite.body.blocked.right) {
            this.sndBallBounce.play();
        }
    },

    /**
     * Initialize the game assets
     */
    initGraphics: function () {
        // start out at coordinates 0,0
        this.backgroundGraphics = game.add.graphics(0, 0);
        // set line thickness, color and opacity
        this.backgroundGraphics.lineStyle(2, 0xFFFFFF, 1);

        // draw the dotted line
        // move the graphics object to the middle of the field, and start drawing downwards for dashSize pixels.
        for (var y = 0; y < gameProperties.screenHeight; y += gameProperties.dashSize * 2) {
            this.backgroundGraphics.moveTo(game.world.centerX, y);
            this.backgroundGraphics.lineTo(game.world.centerX, y + gameProperties.dashSize);
        }

        // and add the remaining graphical assets
        // set the sprite's anchor to 50% of its height/width
        this.ballSprite = game.add.sprite(game.world.centerX, game.world.centerY, graphicAssets.ballName);
        this.ballSprite.anchor.set(0.5, 0.5);

        this.paddleLeftSprite = game.add.sprite(gameProperties.paddleLeft_x, game.world.centerY, graphicAssets.paddleName);
        this.paddleLeftSprite.anchor.set(0.5, 0.5);

        this.paddleRightSprite = game.add.sprite(gameProperties.paddleRight_x, game.world.centerY, graphicAssets.paddleName);
        this.paddleRightSprite.anchor.set(0.5, 0.5);

        this.tf_scoreLeft = game.add.text(fontAssets.scoreLeft_x, fontAssets.scoreTop_y, "0", fontAssets.scoreFontStyle);
        this.tf_scoreLeft.anchor.set(0.5, 0); // anchor point for the scores is at the top

        this.tf_scoreRight = game.add.text(fontAssets.scoreRight_x, fontAssets.scoreTop_y, "0", fontAssets.scoreFontStyle);

        this.instructions = game.add.text(game.world.centerX, game.world.centerY, labels.demoInstructions, fontAssets.instructionsFontStyle);
        this.instructions.anchor.set(0.5, 0.5); // anchor to the middle

        //display below the score
        this.winnerLeft = game.add.text(gameProperties.screenWidth * 0.25, gameProperties.screenHeight * 0.25, labels.winner, fontAssets.instructionsFontStyle);
        this.winnerLeft.anchor.set(0.5, 0.5);

        this.winnerRight = game.add.text(gameProperties.screenWidth * 0.75, gameProperties.screenHeight * 0.25, labels.winner, fontAssets.instructionsFontStyle);
        this.winnerRight.anchor.set(0.5, 0.5);

        // and hide the text fields afterwards
        this.hideTextFields();
    },

    /**
     * Initialize Phaser's ARCADE physics engine for collision checking
     */
    initPhysics: function () {
        game.physics.startSystem(Phaser.Physics.ARCADE); // ARCADE is a higher performance but lower accuracy collision detection system
        game.physics.enable(this.ballSprite, Phaser.Physics.ARCADE);

        this.ballSprite.checkWorldBounds = true;
        this.ballSprite.body.collideWorldBounds = true;
        this.ballSprite.body.immovable = true;
        this.ballSprite.body.bounce.set(1); // velocity multiplier after the object collides with something else
        this.ballSprite.events.onOutOfBounds.add(this.ballOutOfBounds, this); // trigger event when out of bounds

        // group both paddles together and set the physics properties for the whole group
        this.paddleGroup = game.add.group();
        this.paddleGroup.enableBody = true;
        this.paddleGroup.physicsBodyType = Phaser.Physics.ARCADE;

        this.paddleGroup.add(this.paddleLeftSprite);
        this.paddleGroup.add(this.paddleRightSprite);

        this.paddleGroup.setAll('checkWorldBounds', true);
        this.paddleGroup.setAll('body.collideWorldBounds', true);
        this.paddleGroup.setAll('body.immovable', true);
    },

    /**
     * Run the game demo on startup, before any user input is given
     */
    startDemo: function () {
        this.instructions.visible = true;

        this.resetBall();
        this.enablePaddles(false);
        this.enableBoundaries(true);
        game.input.onDown.add(this.startGame, this);
    },

    /**
     * Start moving the ball from its reset position
     */
    startBall: function () {
        this.ballSprite.visible = true; // set ball to visible after the timer runs out

        this.ballVelocity = gameProperties.ballVelocity;
        this.ballReturnCount = 0;

        // concat both arrays and pick a random value from them
        var randomAngle = game.rnd.pick(gameProperties.ballRandomStartingAngleRight.concat(gameProperties.ballRandomStartingAngleLeft));

        // start ball to the side of the losing player
        if (this.missedSide === 'right') {
            randomAngle = game.rnd.pick(gameProperties.ballRandomStartingAngleRight);
        } else if (this.missedSide === 'left') {
            randomAngle = game.rnd.pick(gameProperties.ballRandomStartingAngleLeft);
        }
        game.physics.arcade.velocityFromAngle(randomAngle, gameProperties.ballVelocity, this.ballSprite.body.velocity);
    },

    /**
     * Actually start the game on user input
     */
    startGame: function () {
        game.input.onDown.remove(this.startGame, this);
        this.enablePaddles(true);
        this.enableBoundaries(false); // disable here, so we can register when the ball goes out of bounds and a player scores
        this.resetBall();
        this.resetScores();
        this.hideTextFields();
    },

    /**
     * Reset the ball to a random position on the vertical axis
     */
    resetBall: function () {
        // move ball to the horizontal center, and a random vertical coordinate
        this.ballSprite.reset(game.world.centerX, game.rnd.between(0, gameProperties.screenHeight));
        this.ballSprite.visible = false;
        game.time.events.add(Phaser.Timer.SECOND * gameProperties.ballStartDelay, this.startBall, this);
    },

    /**
     * Set the visibility and key bindings of the paddles
     * @param enabled: true or false, enables or disables the paddles
     */
    enablePaddles: function (enabled) {
        this.paddleGroup.setAll('visible', enabled);
        this.paddleGroup.setAll('body.enabled', enabled);

        this.paddleLeft_up.enabled = enabled;
        this.paddleLeft_down.enabled = enabled;
        this.paddleRight_up.enabled = enabled;
        this.paddleRight_down.enabled = enabled;

        // center both paddles on start
        this.paddleLeftSprite.y = game.world.centerY;
        this.paddleRightSprite.y = game.world.centerY;
    },

    /**
     * set key bindings for moving the paddles
     */
    initKeyboard: function () {
        this.paddleLeft_up = game.input.keyboard.addKey(Phaser.Keyboard.A);
        this.paddleLeft_down = game.input.keyboard.addKey(Phaser.Keyboard.Z);

        this.paddleRight_up = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        this.paddleRight_down = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    },

    moveLeftPaddle: function () {
        // accelerate paddle according to pressed keys
        if (this.paddleLeft_up.isDown) {
            this.paddleLeftSprite.body.velocity.y = -gameProperties.paddleVelocity; // upwards
        } else if (this.paddleLeft_down.isDown) {
            this.paddleLeftSprite.body.velocity.y = gameProperties.paddleVelocity; // downwards
        } else {
            this.paddleLeftSprite.body.velocity.y = 0; // don't move if no button is pressed
        }

        // check for top gap
        if (this.paddleLeftSprite.body.y < gameProperties.paddleTopGap) {
            this.paddleLeftSprite.body.y = gameProperties.paddleTopGap;
        }
    },

    moveRightPaddle: function () {
        // accelerate paddle according to pressed keys
        if (this.paddleRight_up.isDown) {
            this.paddleRightSprite.body.velocity.y = -gameProperties.paddleVelocity; // upwards
        } else if (this.paddleRight_down.isDown) {
            this.paddleRightSprite.body.velocity.y = gameProperties.paddleVelocity; // downwards
        } else {
            this.paddleRightSprite.body.velocity.y = 0; // don't move if no button is pressed
        }

        // check for top gap
        if (this.paddleRightSprite.body.y < gameProperties.paddleTopGap) {
            this.paddleRightSprite.body.y = gameProperties.paddleTopGap;
        }
    },

    /**
     * Calculate the bounce-off angle when the ball collides with a paddle
     * @param ball: the ball that collided with a paddle
     * @param paddle: the paddle the ball collided with
     */
    collideWithPaddle: function (ball, paddle) {
        this.sndBallHit.play();

        var returnAngle;
        // get the segment the ball hit on the paddle. ranges from -3 to 3
        var segmentHit = Math.floor((ball.y - paddle.y) / gameProperties.paddleSegmentHeight);

        // check if maximum segment value of 4 is exceeded. do the same for the bottom segments (-4)
        // subtract 1 from the result for segmentHit, because they range from 0-3
        if (segmentHit >= gameProperties.paddleSegmentsMax) {
            segmentHit = gameProperties.paddleSegmentsMax - 1;
        } else if (segmentHit <= -gameProperties.paddleSegmentsMax - 1) {
            segmentHit = -(gameProperties.paddleSegmentsMax - 1);
        }

        // check whether left or right paddle was hit.
        // left if horizontal position of the paddle is less than half of the screen, otherwise right paddle
        if (paddle.x < gameProperties.screenWidth * 0.5) {
            // calculate actual angle by multiplying hit segment by the segment angle constant.
            returnAngle = segmentHit * gameProperties.paddleSegmentAngle;
            game.physics.arcade.velocityFromAngle(returnAngle, this.ballVelocity, this.ballSprite.body.velocity);
        } else {
            // offset by 180 degrees if right paddle is hit
            returnAngle = 180 - (segmentHit * gameProperties.paddleSegmentAngle);
            if (returnAngle > 180) {
                returnAngle -= 360;
            }
            game.physics.arcade.velocityFromAngle(returnAngle, this.ballVelocity, this.ballSprite.body.velocity);
        }

        this.ballReturnCount++;

        if(this.ballReturnCount >= gameProperties.ballReturnCount) {
            this.ballReturnCount = 0;
            this.ballVelocity += gameProperties.ballVelocityIncrement;
        }
    },

    /**
     * Change the ball's collision behind the paddles
     * @param enabled: true to enable, false to disable (lets the ball pass through the boundary)
     */
    enableBoundaries: function (enabled) {
        game.physics.arcade.checkCollision.left = enabled;
        game.physics.arcade.checkCollision.right = enabled;
    },

    ballOutOfBounds: function () {
        this.sndBallMissed.play();

        // check on which side the out of bounds occurred and increase score
        if (this.ballSprite.x < 0) {
            this.missedSide = 'left';
            this.scoreRight++;
        } else if (this.ballSprite.x > gameProperties.screenWidth) { // do we need the if here?
            this.missedSide = 'right';
            this.scoreLeft++;
        }

        this.updateScoreTextFields();

        // reset ball if score is below max score, else put game back to demo mode
        if (this.scoreLeft >= gameProperties.scoreToWin) {
            this.winnerLeft.visible = true;
            this.startDemo();
        } else if (this.scoreRight >= gameProperties.scoreToWin) {
            this.winnerRight.visible = true;
            this.startDemo();
        } else {
            this.resetBall();
        }
    },

    resetScores: function () {
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.updateScoreTextFields();
    },

    updateScoreTextFields: function () {
        this.tf_scoreLeft.text = this.scoreLeft;
        this.tf_scoreRight.text = this.scoreRight;
    },

    initSounds: function () {
        this.sndBallHit = game.add.audio(soundAssets.ballHitName);
        this.sndBallBounce = game.add.audio(soundAssets.ballBounceName);
        this.sndBallMissed = game.add.audio(soundAssets.ballMissedName);
    },

    hideTextFields: function () {
        this.instructions.visible = false;
        this.winnerLeft.visible = false;
        this.winnerRight.visible = false;

    }
};

// Initialise the Phaser framework by creating an instance of a Phaser.Game object and assigning it to a local variable called 'game'.
// The first two arguments are the width and the height of the canvas element. In this case 640 x 480 pixels. You can resize this in the gameProperties object above.
// The third argument is the renderer that will be used. Phaser.AUTO is used to automatically detect whether to use the WebGL or Canvas renderer.
// The fourth argument is 'gameDiv', which is the id of the DOM element we used above in the index.html file where the canvas element is inserted.
var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv');

// Here we declare and add a state to the game object.
// The first argument is the state name that will is used to switch between states
// The second argument is the object name that will used when a state name is called
game.state.add('main', mainState);

// We are using the 'main' state name as the argument to load our new state.
game.state.start('main');