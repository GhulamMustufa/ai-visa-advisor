import fs from "fs";
import { retrieveEvidence } from "../../lib/evidence";
import { detectConflicts } from "../../lib/validation";
import type { TargetRegion } from "../../lib/types";
import dataset from "./rag-dataset.json";

// Mock the environment so retrieveEvidence doesn't crash if unconfigured
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "dummy_key";

async function runEvaluations() {
  console.log("Starting RAG Retrieval Evaluation...");
  
  let totalPrecision = 0;
  let totalRecall = 0;
  let validTests = 0;
  
  for (const testCase of dataset) {
    console.log(`\nEvaluating [${testCase.id}]: ${testCase.query}`);
    
    // 1. Run Retrieval
    const evidenceList = await retrieveEvidence(
      testCase.query, 
      testCase.targetRegion as TargetRegion, 
      testCase.pathwayId, 
      5
    );
    
    // 2. Resolve Conflicts (per architecture requirements)
    const conflicts = detectConflicts(evidenceList);
    if (conflicts.length > 0) {
      console.log(`  -> Detected ${conflicts.length} conflict(s). Resolved via Authority Tier preference.`);
    }

    // Filter evidence based on conflict resolution (dropping the losing claims)
    // In our implementation, `detectConflicts` returns the `resolvedEvidence`. 
    // We remove the conflicting claims that are NOT the resolved one.
    const resolvedIds = new Set<string>();
    conflicts.forEach(c => {
      if (c.resolvedEvidence) resolvedIds.add(c.resolvedEvidence.source_id);
    });
    
    const conflictingSourceIdsToRemove = new Set<string>();
    conflicts.forEach(c => {
      c.conflictingClaims.forEach(claim => {
        if (claim.source_id !== c.resolvedEvidence?.source_id) {
          conflictingSourceIdsToRemove.add(claim.source_id);
        }
      });
    });

    const finalEvidence = evidenceList.filter(e => !conflictingSourceIdsToRemove.has(e.source_id));

    // 3. Compute Metrics
    const retrievedSourceIds = finalEvidence.map(e => e.source_id);
    const expected = testCase.expected_source_ids;
    
    const truePositives = retrievedSourceIds.filter(id => expected.includes(id)).length;
    const falsePositives = retrievedSourceIds.filter(id => !expected.includes(id)).length;
    const falseNegatives = expected.filter(id => !retrievedSourceIds.includes(id)).length;

    // Precision: % of retrieved items that are relevant
    const precision = retrievedSourceIds.length > 0 ? truePositives / retrievedSourceIds.length : 0;
    
    // Recall: % of relevant items that were retrieved
    const recall = expected.length > 0 ? truePositives / expected.length : (retrievedSourceIds.length === 0 ? 1 : 0);

    // If a test case expects 0 sources (missing evidence scenario)
    if (expected.length === 0) {
      if (retrievedSourceIds.length === 0) {
        totalPrecision += 1;
        totalRecall += 1;
      } else {
        totalPrecision += 0;
        totalRecall += 0;
      }
    } else {
      totalPrecision += precision;
      totalRecall += recall;
    }
    
    validTests++;

    console.log(`  -> Retrieved ${retrievedSourceIds.length} sources.`);
    console.log(`  -> Precision: ${(precision * 100).toFixed(1)}% | Recall: ${(recall * 100).toFixed(1)}%`);
  }

  console.log("\n==================================");
  console.log(`Final Evaluation Score (across ${validTests} test cases):`);
  console.log(`Mean Retrieval Precision: ${(totalPrecision / validTests * 100).toFixed(2)}%`);
  console.log(`Mean Retrieval Recall: ${(totalRecall / validTests * 100).toFixed(2)}%`);
  console.log("==================================");
}

runEvaluations().catch(console.error);
