import React, { Component } from 'react';
import './arena.css';
import Modal from '../modal';
import { Indicator } from '../indicator';
import { Rival } from '../rival';
import vsImage from '../../resources/versus.png';
import { saveFight } from '../../services/domainRequest/fightRequest';

import controls from '../../constants/controls';

const { PlayerOneAttack, PlayerOneBlock, PlayerTwoAttack, PlayerTwoBlock } =
  controls;

// ******************************************

class Arena extends Component {
  //
  playerOne = this.props.rivals.fighter1;
  playerTwo = this.props.rivals.fighter2;

  playerOneInitialHealth = this.playerOne.health;
  playerTwoInitialHealth = this.playerTwo.health;

  coolDownInterval = 10000;
  events = ['keydown', 'keyup'];

  state = {
    pressedComboOneKeys: [],
    pressedComboTwoKeys: [],

    playerOneCoolDown: false,
    playerTwoCoolDown: false,

    playerOneBlocks: false,
    playerTwoBlocks: false,

    playerOneHealth: this.playerOneInitialHealth,
    playerTwoHealth: this.playerTwoInitialHealth,

    winner: null,

    fightLog: {
      fighter1: this.playerOne.id,
      fighter2: this.playerTwo.id,
      log: [],
    },
  };

  // **************** Lifecycle ****************

  componentDidMount() {
    this.events.forEach((eventType) =>
      document.addEventListener(eventType, this.keyPressHandler)
    );
  }

  componentDidUpdate(_, prevState) {
    const { playerOne, playerTwo } = this;

    const {
      playerOneHealth,
      playerTwoHealth,
      playerOneCoolDown,
      playerTwoCoolDown,
      pressedComboOneKeys,
      pressedComboTwoKeys,
    } = this.state;

    const playerOneHealthBar = document.querySelector(
      `#left-fighter-indicator`
    );
    const playerTwoHealthBar = document.querySelector(
      `#right-fighter-indicator`
    );

    // Power strike
    if (pressedComboOneKeys.length === 3) {
      const isCombo = true;
      const damage = this.getHitPower(playerOne, isCombo);

      this.setState((prevState) =>
        this.handleStrike(prevState, damage, playerOne, isCombo)
      );
    }

    if (pressedComboTwoKeys.length === 3) {
      const isCombo = true;
      const damage = this.getHitPower(playerTwo, isCombo);

      this.setState((prevState) =>
        this.handleStrike(prevState, damage, playerTwo, isCombo)
      );
    }

    // Power strike cooldown reset
    if (prevState.playerOneCoolDown !== playerOneCoolDown) {
      setTimeout(() => {
        this.setState({ playerOneCoolDown: false });
      }, this.coolDownInterval);
    }

    if (prevState.playerTwoCoolDown !== playerTwoCoolDown) {
      setTimeout(() => {
        this.setState({ playerTwoCoolDown: false });
      }, this.coolDownInterval);
    }

    // Health indicator update and/or end of fight
    if (prevState.playerOneHealth !== playerOneHealth) {
      if (playerOneHealth > 0) {
        playerOneHealthBar.style.width = `${
          (playerOneHealth * 100) / this.playerOneInitialHealth
        }%`;
      } else {
        playerOneHealthBar.style.width = '0%';
        this.setState({ winner: this.playerTwo.name });
      }
    }

    if (prevState.playerTwoHealth !== playerTwoHealth) {
      if (playerTwoHealth > 0) {
        playerTwoHealthBar.style.width = `${
          (playerTwoHealth * 100) / this.playerTwoInitialHealth
        }%`;
      } else {
        playerTwoHealthBar.style.width = '0%';
        this.setState({ winner: this.playerOne.name });
      }
    }
  }

  async componentWillUnmount() {
    this.events.forEach((eventType) =>
      document.removeEventListener(eventType, this.keyPressHandler)
    );

    const fightLog = await saveFight(this.state.fightLog);
    const error =
      "Sorry, couldn't retrieve fight log. \nNo log will  be saved for this fight";

    if (this.state.fightLog.log.length === 0 || !fightLog) alert(error);
  }

  // **************** Methods ****************

  getChance(min, max) {
    const chance = Math.random() * (max - min) + min;

    return chance;
  }

  getHitPower(player, isCombo = false) {
    const criticalHitChance = isCombo ? 2 : this.getChance(1, 2);
    const hitPower = (player.power / 10) * criticalHitChance;
    const normalizedHitPower = +hitPower.toFixed(2);

    return normalizedHitPower;
  }

  getBlockPower(player) {
    const dodgeChance = this.getChance(1, 2);
    const blockPower = player.defense * dodgeChance;
    const normalizedBlockPower = +blockPower.toFixed(2);

    return normalizedBlockPower;
  }

  getDamage(attacker, defender) {
    const hitPower = this.getHitPower(attacker);
    const blockPower = this.getBlockPower(defender);

    let damage = 0;

    if (hitPower > blockPower) {
      damage = hitPower - blockPower;
    }

    return damage;
  }

  makeRoundLog(player, damage, prevState) {
    const { playerOneHealth, playerTwoHealth } = prevState;

    // Dummy log object
    const roundLog = {
      fighter1Shot: 0,
      fighter2Shot: 0,
      fighter1Health: playerOneHealth,
      fighter2Health: playerTwoHealth,
    };

    const isPlayer1 = player === 1;
    const opponent = isPlayer1 ? 2 : 1;

    // Log object keys
    const playerStrikeKey = `fighter${player}Shot`;
    const opponentHealthKey = `fighter${opponent}Health`;

    const opponentHealth = isPlayer1 ? playerTwoHealth : playerOneHealth;
    const resultingOpponentHealth = +(opponentHealth - damage).toFixed(2);

    roundLog[playerStrikeKey] = damage;
    roundLog[opponentHealthKey] = resultingOpponentHealth;

    return roundLog;
  }

  handleCombo(attackingPlayer, code) {
    const isPlayerOne = attackingPlayer === this.playerOne;
    const player = isPlayerOne ? 'One' : 'Two';

    const coolDownKey = `player${player}CoolDown`;
    const pressedComboArrayKey = `pressedCombo${player}Keys`;
    const combinationKey = `Player${player}CriticalHitCombination`;

    const combination = controls[combinationKey];

    // Is one of combo keys pressed?
    const oneOfComboKeysPressed =
      code === combination[0] ||
      code === combination[1] ||
      code === combination[2];

    const isPlayerInCoolDown = this.state[coolDownKey];
    const pressedComboKeys = this.state[pressedComboArrayKey];

    const isCombo =
      !isPlayerInCoolDown &&
      !pressedComboKeys.includes(code) &&
      oneOfComboKeysPressed;

    // If pressed, add the key to player's combo array:
    if (isCombo) {
      this.setState((prevState) => {
        const currentArray = prevState[pressedComboArrayKey];
        const updatedArray = [...currentArray];
        updatedArray.push(code);

        return {
          [pressedComboArrayKey]: updatedArray,
        };
      });
    }
  }

  handleStrike(prevState, damage, player, isCombo = false) {
    isCombo && console.log('Power strike!');
    const isPlayerOne = player === this.playerOne;

    const playerNo = isPlayerOne ? 1 : 2;
    const attacker = isPlayerOne ? 'One' : 'Two';
    const defender = !isPlayerOne ? 'One' : 'Two';

    const roundLog = this.makeRoundLog(playerNo, damage, prevState);

    const newLogArray = [...prevState.fightLog.log];
    newLogArray.push(roundLog);

    // Get object keys
    const attackerCoolDownKey = `player${attacker}CoolDown`;
    const attackerComboKey = `pressedCombo${attacker}Keys`;
    const defenderHealthKey = `player${defender}Health`;

    // Get defender's health
    const defenderHealth = prevState[defenderHealthKey];
    const difference = +(defenderHealth - damage).toFixed(2);

    // Compose resulting state object
    const nonComboState = {
      [defenderHealthKey]: difference,
      fightLog: {
        log: newLogArray,
      },
    };

    const comboState = {
      ...nonComboState,
      [attackerComboKey]: [],
      [attackerCoolDownKey]: true,
    };

    const modifiedState = isCombo ? comboState : nonComboState;

    return modifiedState;
  }

  handleComboKeyRelease(player, code) {
    const isPlayerOne = player === this.playerOne;
    const attacker = isPlayerOne ? 'One' : 'Two';

    const pressedComboArrayKey = `pressedCombo${attacker}Keys`;

    const pressedComboKeys = this.state[pressedComboArrayKey];
    const index = pressedComboKeys.indexOf(code);

    this.setState((prevState) => {
      const updatedArray = prevState[pressedComboArrayKey].toSpliced(index, 1);

      return { [pressedComboArrayKey]: updatedArray };
    });
  }

  keyPressHandler = (event) => {
    const { playerOne, playerTwo } = this;
    const { type, code, repeat } = event;

    if (repeat) return;

    if (type === 'keydown') {
      const { playerOneBlocks, playerTwoBlocks } = this.state;

      // PLAYER 1

      // Player 1 regular attack
      if (!playerOneBlocks && code === PlayerOneAttack) {
        const damage = playerTwoBlocks
          ? this.getDamage(playerOne, playerTwo)
          : this.getHitPower(playerOne);

        this.setState((prevState) =>
          this.handleStrike(prevState, damage, playerOne)
        );
      }

      // Player 1 block
      if (code === PlayerOneBlock) this.setState({ playerOneBlocks: true });

      // Player 1 combo
      this.handleCombo(playerOne, code);

      // PLAYER 2

      // Player 2 regular attack
      if (!playerTwoBlocks && code === PlayerTwoAttack) {
        const damage = playerOneBlocks
          ? this.getDamage(playerTwo, playerOne)
          : this.getHitPower(playerTwo);

        this.setState((prevState) =>
          this.handleStrike(prevState, damage, playerTwo)
        );
      }

      // Player 2 block
      if (code === PlayerTwoBlock) this.setState({ playerTwoBlocks: true });

      // Player 2 combo
      this.handleCombo(playerTwo, code);
    }

    if (type === 'keyup') {
      const { pressedComboOneKeys, pressedComboTwoKeys } = this.state;
      //
      // Remove key from player combo array on keyup
      if (pressedComboOneKeys.includes(code))
        this.handleComboKeyRelease(playerOne, code);

      if (pressedComboTwoKeys.includes(code))
        this.handleComboKeyRelease(playerTwo, code);

      // Release block
      if (code === PlayerOneBlock) this.setState({ playerOneBlocks: false });

      if (code === PlayerTwoBlock) this.setState({ playerTwoBlocks: false });
    }
  };

  // **************** Render ****************

  render() {
    const { fighter1, fighter2 } = this.props.rivals;
    const { winner } = this.state;

    return (
      <div className="arena___root">
        {winner && <Modal winner={winner} onClose={this.props.onGameOver} />}

        <div className="arena___fight-status">
          <Indicator side="left" name={fighter1.name} />
          <img className="arena___versus-sign" src={vsImage} alt="versus" />
          <Indicator side="right" name={fighter2.name} />
        </div>

        <div className="arena___battlefield">
          <Rival side="left" fighter={fighter1} />
          <Rival side="right" fighter={fighter2} />
        </div>
      </div>
    );
  }
}

export default Arena;
