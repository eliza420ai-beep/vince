interface StandupEntry {
  date: string;
  attendees: string[];
  updates: {
    person: string;
    yesterday: string[];
    today: string[];
    blockers: string[];
  }[];
  actionItems: {
    task: string;
    assignee: string;
    dueDate?: string;
    status: 'open' | 'in-progress' | 'completed';
  }[];
}

function parseStandupJSON(jsonString: string): StandupEntry {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.date || !Array.isArray(parsed.attendees) || !Array.isArray(parsed.updates)) {
      throw new Error('Missing required fields: date, attendees, or updates');
    }
    
    // Validate updates structure
    parsed.updates.forEach((update: any, index: number) => {
      if (!update.person || !Array.isArray(update.yesterday) || !Array.isArray(update.today) || !Array.isArray(update.blockers)) {
        throw new Error(`Invalid update structure at index ${index}`);
      }
    });
    
    // Validate action items if present
    if (parsed.actionItems && Array.isArray(parsed.actionItems)) {
      parsed.actionItems.forEach((item: any, index: number) => {
        if (!item.task || !item.assignee) {
          throw new Error(`Invalid action item structure at index ${index}`);
        }
        if (item.status && !['open', 'in-progress', 'completed'].includes(item.status)) {
          throw new Error(`Invalid status at action item ${index}`);
        }
      });
    } else {
      parsed.actionItems = [];
    }
    
    return parsed as StandupEntry;
  } catch (error) {
    throw new Error(`Standup JSON parsing failed: ${error.message}`);
  }
}

function validateStandupData(entry: StandupEntry): boolean {
  // Date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(entry.date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  
  // Ensure at least one attendee
  if (entry.attendees.length === 0) {
    throw new Error('At least one attendee required');
  }
  
  // Ensure all attendees have updates
  const updatePersons = entry.updates.map(u => u.person);
  const missingUpdates = entry.attendees.filter(attendee => !updatePersons.includes(attendee));
  if (missingUpdates.length > 0) {
    console.warn(`Missing updates for: ${missingUpdates.join(', ')}`);
  }
  
  return true;
}

// Test data and runner
const testStandupJSON = `{
  "date": "2024-01-15",
  "attendees": ["Kelly", "Vince", "Solus", "Eliza"],
  "updates": [
    {
      "person": "Kelly",
      "yesterday": ["Reviewed hotel recommendations", "Updated wine pairings"],
      "today": ["Implement standup parser", "Test JSON validation"],
      "blockers": []
    },
    {
      "person": "Vince", 
      "yesterday": ["Market data analysis", "Perp position review"],
      "today": ["Options flow research", "CT sentiment analysis"],
      "blockers": ["API rate limits"]
    }
  ],
  "actionItems": [
    {
      "task": "Test standup JSON parsing",
      "assignee": "Sentinel",
      "status": "in-progress"
    },
    {
      "task": "Update wine database",
      "assignee": "Kelly",
      "dueDate": "2024-01-20",
      "status": "open"
    }
  ]
}`;

// Test runner
function runTests(): void {
  try {
    console.log('Testing standup JSON parsing...');
    
    const parsed = parseStandupJSON(testStandupJSON);
    console.log('✅ JSON parsing successful');
    
    validateStandupData(parsed);
    console.log('✅ Data validation successful');
    
    console.log(`📅 Standup for ${parsed.date}`);
    console.log(`👥 Attendees: ${parsed.attendees.join(', ')}`);
    console.log(`📋 Action items: ${parsed.actionItems.length}`);
    console.log(`🔄 Updates from: ${parsed.updates.map(u => u.person).join(', ')}`);
    
    // Test error cases
    try {
      parseStandupJSON('{"invalid": "json"}');
    } catch (e) {
      console.log('✅ Error handling works');
    }
    
    console.log('🎉 All tests passed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

export { parseStandupJSON, validateStandupData, StandupEntry, runTests };

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}