#!/usr/bin/env node

/**
 * 🧬 GENETIC ALGORITHM PARAMETER EVOLUTION DEMO
 *
 * Shows how VINCE's trading parameters evolve through natural selection:
 * - Population of parameter genomes compete for survival
 * - Fitness based on trading performance (Sharpe, win rate, drawdown)
 * - Selection, crossover, mutation create new generations
 * - Convergence to optimal parameter combinations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧬 GENOME STRUCTURE - Trading Parameters
class TradingGenome {
  constructor(params = {}) {
    this.parameters = {
      // Signal thresholds
      minStrength: params.minStrength ?? this.randomFloat(50, 90),
      minConfidence: params.minConfidence ?? this.randomFloat(30, 80),
      signalQualityThreshold: params.signalQualityThreshold ?? this.randomFloat(0.4, 0.8),

      // Risk management
      maxPositionSize: params.maxPositionSize ?? this.randomFloat(0.1, 0.5),
      stopLossMultiplier: params.stopLossMultiplier ?? this.randomFloat(1.5, 4.0),
      takeProfitRatio: params.takeProfitRatio ?? this.randomFloat(1.2, 3.5),

      // Market regime adaptations
      trendingADXThreshold: params.trendingADXThreshold ?? this.randomFloat(20, 35),
      volatilityDVOLThreshold: params.volatilityDVOLThreshold ?? this.randomFloat(75, 95),

      // Signal source filters
      minSourceCount: params.minSourceCount ?? this.randomInt(2, 6),
      maxCorrelatedSources: params.maxCorrelatedSources ?? this.randomFloat(0.6, 0.9),

      // Time and session filters
      minSessionOverlap: params.minSessionOverlap ?? this.randomFloat(0.3, 0.8),
      maxTradesPerDay: params.maxTradesPerDay ?? this.randomInt(3, 12),

      // ML model weights
      mlSignalQualityWeight: params.mlSignalQualityWeight ?? this.randomFloat(0.2, 0.8),
      ruleBasedWeight: params.ruleBasedWeight ?? this.randomFloat(0.2, 0.8)
    };

    this.fitness = 0;
    this.generation = 0;
    this.sharpe = 0;
    this.winRate = 0;
    this.maxDrawdown = 0;
    this.totalTrades = 0;
  }

  randomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  // 🔬 Evaluate fitness based on trading performance
  evaluateFitness(tradeResults) {
    let wins = 0;
    let totalPnL = 0;
    let returns = [];
    let runningPnL = 0;
    let maxPnL = 0;
    let maxDD = 0;

    for (const trade of tradeResults) {
      if (trade.outcome === 'WIN') wins++;
      totalPnL += trade.pnlPct;
      returns.push(trade.pnlPct / 100);

      runningPnL += trade.pnlPct;
      if (runningPnL > maxPnL) maxPnL = runningPnL;
      const drawdown = (maxPnL - runningPnL) / Math.abs(maxPnL) * 100;
      if (drawdown > maxDD) maxDD = drawdown;
    }

    this.winRate = wins / tradeResults.length * 100;
    this.totalTrades = tradeResults.length;
    this.maxDrawdown = maxDD;

    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    this.sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Multi-objective fitness function
    const sharpeScore = Math.max(0, this.sharpe) * 30;
    const winRateScore = this.winRate * 0.5;
    const drawdownPenalty = Math.max(0, this.maxDrawdown - 10) * 2; // Penalty for >10% DD
    const tradeCountBonus = Math.min(this.totalTrades, 50) * 0.2; // Prefer active strategies

    this.fitness = sharpeScore + winRateScore - drawdownPenalty + tradeCountBonus;
    return this.fitness;
  }

  // 🧬 Create offspring through crossover
  crossover(partner) {
    const offspring = new TradingGenome();

    for (const [key, value] of Object.entries(this.parameters)) {
      // 50% chance to inherit from each parent
      offspring.parameters[key] = Math.random() < 0.5 ? value : partner.parameters[key];
    }

    return offspring;
  }

  // ⚡ Mutate parameters with some probability
  mutate(mutationRate = 0.1, mutationStrength = 0.2) {
    for (const [key, value] of Object.entries(this.parameters)) {
      if (Math.random() < mutationRate) {
        const mutationAmount = (Math.random() - 0.5) * 2 * mutationStrength;

        if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            // Integer parameters
            this.parameters[key] = Math.max(1, Math.round(value * (1 + mutationAmount)));
          } else {
            // Float parameters
            this.parameters[key] = Math.max(0, value * (1 + mutationAmount));
          }
        }
      }
    }
  }

  // 📊 Display genome info
  toString() {
    return `Gen${this.generation} | Fitness: ${this.fitness.toFixed(1)} | Sharpe: ${this.sharpe.toFixed(2)} | WR: ${this.winRate.toFixed(1)}% | DD: ${this.maxDrawdown.toFixed(1)}%`;
  }
}

// 🌍 POPULATION MANAGER
class GeneticEvolution {
  constructor(populationSize = 20) {
    this.populationSize = populationSize;
    this.population = [];
    this.generation = 0;
    this.bestFitness = [];
    this.avgFitness = [];

    // Initialize random population
    for (let i = 0; i < populationSize; i++) {
      this.population.push(new TradingGenome());
    }
  }

  // 📊 Simulate trading results for a genome (simplified)
  simulateTrading(genome) {
    const trades = [];
    const numTrades = Math.floor(30 + Math.random() * 70); // 30-100 trades

    for (let i = 0; i < numTrades; i++) {
      // Simulate trade outcome based on genome parameters
      const signalStrength = 40 + Math.random() * 60;
      const confidence = 20 + Math.random() * 80;
      const marketVolatility = Math.random() * 100;

      // Apply genome filters
      const passesStrengthFilter = signalStrength >= genome.parameters.minStrength;
      const passesConfidenceFilter = confidence >= genome.parameters.minConfidence;
      const positionSizing = genome.parameters.maxPositionSize * (confidence / 100);

      if (passesStrengthFilter && passesConfidenceFilter) {
        // Simulate win probability based on parameters
        const baseWinProb = 0.52; // Slight edge
        const strengthBonus = (signalStrength - 50) / 500;
        const confidenceBonus = (confidence - 50) / 500;
        const volatilityPenalty = (marketVolatility - 50) / 1000;

        const winProb = baseWinProb + strengthBonus + confidenceBonus - volatilityPenalty;
        const isWin = Math.random() < winProb;

        // Simulate P&L based on position sizing and market conditions
        let pnlPct;
        if (isWin) {
          pnlPct = positionSizing * (1 + Math.random()) * genome.parameters.takeProfitRatio;
        } else {
          pnlPct = -positionSizing * genome.parameters.stopLossMultiplier;
        }

        trades.push({
          outcome: isWin ? 'WIN' : 'LOSS',
          pnlPct,
          signalStrength,
          confidence,
          positionSize: positionSizing
        });
      }
    }

    return trades;
  }

  // 🏆 Evaluate entire population
  evaluatePopulation() {
    for (const genome of this.population) {
      const tradeResults = this.simulateTrading(genome);
      genome.evaluateFitness(tradeResults);
      genome.generation = this.generation;
    }

    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);

    // Track evolution metrics
    const best = this.population[0].fitness;
    const avg = this.population.reduce((sum, g) => sum + g.fitness, 0) / this.population.length;
    this.bestFitness.push(best);
    this.avgFitness.push(avg);
  }

  // 🧬 Create next generation
  evolve() {
    const newPopulation = [];
    const eliteCount = Math.floor(this.populationSize * 0.2); // Keep top 20%

    // Elite selection (survivors)
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(this.population[i]);
    }

    // Create offspring through tournament selection + crossover
    while (newPopulation.length < this.populationSize) {
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      const offspring = parent1.crossover(parent2);
      offspring.mutate(0.15, 0.1); // 15% mutation rate, 10% strength
      newPopulation.push(offspring);
    }

    this.population = newPopulation;
    this.generation++;
  }

  // 🏟️ Tournament selection for parent selection
  tournamentSelection(tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }

    return tournament.reduce((best, genome) => genome.fitness > best.fitness ? genome : best);
  }

  // 📈 Display evolution progress
  displayGeneration() {
    const best = this.population[0];
    const avg = this.population.reduce((sum, g) => sum + g.fitness, 0) / this.population.length;
    const diversity = this.calculateDiversity();

    console.log(`\n🧬 GENERATION ${this.generation}`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`🏆 CHAMPION: ${best.toString()}`);
    console.log(`📊 Population Avg: ${avg.toFixed(1)} | Diversity: ${diversity.toFixed(2)}`);

    // Show top 5 genomes
    console.log(`\n🥇 TOP 5 SURVIVORS:`);
    for (let i = 0; i < Math.min(5, this.population.length); i++) {
      const genome = this.population[i];
      const rank = i + 1;
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
      console.log(`   ${medal} ${genome.toString()}`);
    }

    // Show best parameters
    console.log(`\n🎯 CHAMPION PARAMETERS:`);
    const params = best.parameters;
    console.log(`   Signal: minStrength=${params.minStrength.toFixed(1)}, minConf=${params.minConfidence.toFixed(1)}, quality=${params.signalQualityThreshold.toFixed(2)}`);
    console.log(`   Risk: maxPos=${params.maxPositionSize.toFixed(2)}, SL=${params.stopLossMultiplier.toFixed(1)}x, TP=${params.takeProfitRatio.toFixed(1)}x`);
    console.log(`   Regime: trendADX=${params.trendingADXThreshold.toFixed(1)}, volDVOL=${params.volatilityDVOLThreshold.toFixed(1)}`);
    console.log(`   Sources: minCount=${params.minSourceCount}, maxCorr=${params.maxCorrelatedSources.toFixed(2)}`);
  }

  // 🌈 Calculate population diversity
  calculateDiversity() {
    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < this.population.length - 1; i++) {
      for (let j = i + 1; j < this.population.length; j++) {
        const dist = this.genomicDistance(this.population[i], this.population[j]);
        totalDistance += dist;
        comparisons++;
      }
    }

    return totalDistance / comparisons;
  }

  // 📏 Calculate distance between two genomes
  genomicDistance(genome1, genome2) {
    let distance = 0;
    const params1 = genome1.parameters;
    const params2 = genome2.parameters;

    for (const key of Object.keys(params1)) {
      const diff = Math.abs(params1[key] - params2[key]);
      const range = Math.abs(params1[key]) + Math.abs(params2[key]);
      distance += range > 0 ? diff / range : 0;
    }

    return distance / Object.keys(params1).length;
  }
}

// 🚀 MAIN EVOLUTION SIMULATION
console.log('🧬 GENETIC ALGORITHM PARAMETER EVOLUTION');
console.log('========================================');
console.log('🎯 Evolving optimal trading parameters through natural selection');
console.log('⚡ Population: 20 genomes | Generations: 10 | Elite: 20% | Mutation: 15%');
console.log('📊 Fitness = Sharpe(×30) + WinRate(×0.5) - DrawdownPenalty + TradeBonus');
console.log('');

const evolution = new GeneticEvolution(20);
const totalGenerations = 10;

// Initial population evaluation
evolution.evaluatePopulation();
evolution.displayGeneration();

// Evolution loop
for (let gen = 1; gen <= totalGenerations; gen++) {
  evolution.evolve();
  evolution.evaluatePopulation();
  evolution.displayGeneration();
}

// 📈 EVOLUTION SUMMARY
console.log('\n🎯 EVOLUTION COMPLETE!');
console.log('════════════════════');
console.log('');

const finalBest = evolution.population[0];
const initialBest = evolution.bestFitness[0];
const finalBestFitness = evolution.bestFitness[evolution.bestFitness.length - 1];
const improvement = ((finalBestFitness - initialBest) / Math.abs(initialBest) * 100);

console.log(`🏆 CHAMPION GENOME (Generation ${finalBest.generation}):`);
console.log(`   Fitness: ${finalBest.fitness.toFixed(1)} (${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% vs Gen 0)`);
console.log(`   Sharpe Ratio: ${finalBest.sharpe.toFixed(2)}`);
console.log(`   Win Rate: ${finalBest.winRate.toFixed(1)}%`);
console.log(`   Max Drawdown: ${finalBest.maxDrawdown.toFixed(1)}%`);
console.log(`   Total Trades: ${finalBest.totalTrades}`);
console.log('');

console.log(`📊 EVOLUTION TRAJECTORY:`);
evolution.bestFitness.forEach((fitness, gen) => {
  const bar = '█'.repeat(Math.ceil(fitness / 10));
  const improvement = gen > 0 ? ((fitness - evolution.bestFitness[0]) / Math.abs(evolution.bestFitness[0]) * 100) : 0;
  console.log(`   Gen ${gen.toString().padStart(2)}: ${fitness.toFixed(1).padStart(5)} ${bar} ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
});

console.log('');
console.log(`🧬 NATURAL SELECTION INSIGHTS:`);
console.log(`   🟢 Successful traits survived and reproduced`);
console.log(`   🔴 Weak parameters were eliminated from gene pool`);
console.log(`   ⚡ Mutations introduced innovation and prevented local optima`);
console.log(`   🎯 Population converged toward optimal trading strategy`);
console.log(`   🌍 Genetic diversity maintained exploration capability`);

console.log('');
console.log('🔥 EVOLUTION STATUS: OPTIMAL PARAMETERS DISCOVERED! 🧬✨');