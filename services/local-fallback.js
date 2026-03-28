/**
 * TRIAGE AI — Smart Local Fallback Engine (v2)
 *
 * When the Gemini API is unavailable (quota, network, etc.), this module
 * generates intelligent, category-specific structured responses using
 * local keyword analysis and India-specific emergency knowledge.
 *
 * This ensures the app ALWAYS produces useful, actionable output — even offline.
 *
 * @module local-fallback
 */

/**
 * India-specific emergency contacts database
 */
const EMERGENCY_CONTACTS = {
  universal: [
    { name: 'Universal Emergency', number: '112', relevance: 'Single number for all emergencies in India' },
  ],
  medical: [
    { name: 'Ambulance', number: '102', relevance: 'Government ambulance service' },
    { name: 'AIIMS Emergency', number: '011-26588500', relevance: 'Premier hospital emergency' },
    { name: 'Blood Bank (Red Cross)', number: '011-23711551', relevance: 'Emergency blood requirement' },
  ],
  accident: [
    { name: 'Police', number: '100', relevance: 'Traffic accident reporting' },
    { name: 'Ambulance', number: '102', relevance: 'Medical emergency at accident site' },
    { name: 'Traffic Police', number: '1073', relevance: 'Highway accident / traffic help' },
    { name: 'Road Accident Emergency', number: '1033', relevance: 'National Highway Authority' },
  ],
  fire: [
    { name: 'Fire Brigade', number: '101', relevance: 'Direct fire department helpline' },
    { name: 'Universal Emergency', number: '112', relevance: 'For multi-agency rescue' },
    { name: 'Gas Leak Helpline', number: '1906', relevance: 'Cooking gas/LPG leak emergency' },
  ],
  disaster: [
    { name: 'National Disaster Response Force (NDRF)', number: '011-24363260', relevance: 'Disaster relief and rescue' },
    { name: 'Fire Brigade', number: '101', relevance: 'Fire and rescue operations' },
    { name: 'Flood Control Room', number: '1078', relevance: 'Flood emergency reporting' },
    { name: 'NDMA Control Room', number: '011-26701728', relevance: 'National management coordination' },
  ],
  animal: [
    { name: 'Blue Cross of India', number: '044-22354959', relevance: 'Animal rescue and treatment' },
    { name: 'PFA (People For Animals)', number: '011-23357088', relevance: 'Animal welfare and protection' },
    { name: 'Wildlife SOS', number: '9871963535', relevance: 'Wildlife rescue emergencies' },
    { name: 'Street Dog Helpline', number: '1800-11-2005', relevance: 'Municipal animal assistance' },
  ],
  safety: [
    { name: 'Police', number: '100', relevance: 'Crime reporting' },
    { name: 'Women Helpline', number: '1091', relevance: 'Women safety and distress' },
    { name: 'Child Helpline', number: '1098', relevance: 'Child safety and abuse reporting' },
    { name: 'Cyber Crime', number: '1930', relevance: 'Online fraud and cyber crime' },
  ],
  health_records: [
    { name: 'National Health Helpline', number: '1800-180-1104', relevance: 'Free health consultation' },
    { name: 'Poison Control', number: '1066', relevance: 'Drug interaction / poisoning emergencies' },
  ],
  weather: [
    { name: 'Meteorological Dept (IMD)', number: '1800-11-0606', relevance: 'Weather alerts and forecasting' },
    { name: 'Coastal Warning Service', number: '011-24611068', relevance: 'Cyclone and storm warnings' },
  ],
  general: [
    { name: 'Universal Emergency', number: '112', relevance: 'All emergency situations' },
    { name: 'Police', number: '100', relevance: 'Law enforcement' },
    { name: 'Ambulance', number: '102', relevance: 'Medical emergencies' },
    { name: 'Fire', number: '101', relevance: 'Fire emergencies' },
  ],
};

/**
 * Category-specific action templates with rich, actionable steps
 */
const ACTION_TEMPLATES = {
  medical: {
    critical: [
      { priority: 1, action: 'Call 112 or 102 for an ambulance IMMEDIATELY', details: 'Provide exact location, number of injured, and nature of medical emergency. Stay on the line.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 2, action: 'Perform basic first aid if trained', details: 'Check breathing, apply pressure to wounds, keep the person warm and lying down. Do NOT move them unless in immediate danger.', timeframe: 'Immediately', type: 'medical' },
      { priority: 3, action: 'Clear the area and ensure safety', details: 'Remove bystanders, ensure no further hazards (traffic, fire, electrical). Create space for emergency responders.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 4, action: 'Gather critical information for responders', details: 'Note any medications the person is taking, allergies, medical conditions. Check for medical ID bracelet/card.', timeframe: 'Within 5 minutes', type: 'information' },
      { priority: 5, action: 'Contact the person\'s family or emergency contacts', details: 'Check their phone ICE (In Case of Emergency) contacts. Inform family of the situation and hospital being transported to.', timeframe: 'Within 30 minutes', type: 'communication' },
    ],
    urgent: [
      { priority: 1, action: 'Seek medical attention within the hour', details: 'Visit the nearest hospital or clinic. If symptoms worsen, call 102 for an ambulance.', timeframe: 'Within 1 hour', type: 'medical' },
      { priority: 2, action: 'Document symptoms and timeline', details: 'Note when symptoms started, severity on a scale of 1-10, any triggers, and what makes it better or worse.', timeframe: 'Immediately', type: 'information' },
      { priority: 3, action: 'Apply appropriate first aid measures', details: 'For pain: rest and cold compress. For fever: stay hydrated and use paracetamol if not allergic. For wounds: clean and bandage.', timeframe: 'Immediately', type: 'medical' },
      { priority: 4, action: 'Prepare medical documents for the visit', details: 'Bring ID, insurance card, list of current medications, and any recent test reports.', timeframe: 'Before hospital visit', type: 'information' },
    ],
    normal: [
      { priority: 1, action: 'Schedule a doctor appointment', details: 'Visit your nearest clinic or book online via Practo, Apollo 24/7, or your preferred healthcare provider.', timeframe: 'Today', type: 'medical' },
      { priority: 2, action: 'Monitor your symptoms', details: 'Keep a symptom diary noting when they occur, severity, and any patterns. This helps the doctor diagnose accurately.', timeframe: 'Ongoing', type: 'information' },
      { priority: 3, action: 'Maintain healthy habits while waiting', details: 'Stay hydrated, rest adequately, eat balanced meals, avoid strenuous activity until evaluated.', timeframe: 'Ongoing', type: 'prevention' },
    ],
  },
  accident: {
    critical: [
      { priority: 1, action: 'Call 112 immediately — report the accident', details: 'State: location (road name, landmarks, km marker), number of vehicles, number of injured, if anyone is trapped.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 2, action: 'Ensure scene safety', details: 'Turn on hazard lights, set up warning triangles 50m before the scene. Keep bystanders away from the road. Watch for fuel leaks.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 3, action: 'Provide first aid to injured — DO NOT move them', details: 'Check breathing, control bleeding with pressure. Keep injured person still (possible spinal injury). Cover with blanket for warmth.', timeframe: 'Immediately', type: 'medical' },
      { priority: 4, action: 'Document the accident scene', details: 'Take photos/videos of vehicle positions, damage, road conditions, traffic signals, and license plates. This is crucial for insurance.', timeframe: 'When safe', type: 'information' },
      { priority: 5, action: 'File an FIR at the nearest police station', details: 'Under Motor Vehicles Act, all road accidents must be reported. Get a copy of the FIR for insurance claims.', timeframe: 'Within 24 hours', type: 'communication' },
    ],
    urgent: [
      { priority: 1, action: 'Move to safety and assess injuries', details: 'If the vehicle is drivable, move it to the shoulder. Check yourself and passengers for injuries.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 2, action: 'Call traffic police on 1073', details: 'Report the accident location and request assistance. Exchange insurance and contact info with other parties.', timeframe: 'Immediately', type: 'communication' },
      { priority: 3, action: 'Document everything for insurance', details: 'Photograph damage, exchange details with other driver (name, license, insurance, phone). Note time, weather, road conditions.', timeframe: 'Within 1 hour', type: 'information' },
    ],
    normal: [
      { priority: 1, action: 'Ensure all parties are safe', details: 'Check for minor injuries. Even minor collisions can cause whiplash — monitor for neck/back pain over the next 48 hours.', timeframe: 'Immediately', type: 'medical' },
      { priority: 2, action: 'Exchange information and document', details: 'Get the other party\'s name, phone, vehicle number, insurance details. Take photos of the scene.', timeframe: 'Immediately', type: 'information' },
      { priority: 3, action: 'Report to your insurance company', details: 'File a claim within 24 hours. Most insurers have apps for instant claim filing with photo upload.', timeframe: 'Today', type: 'communication' },
    ],
  },
  fire: {
    critical: [
      { priority: 1, action: 'EVACUATE IMMEDIATELY and Call 101', details: 'Leave all belongings. Use stairs, never elevators. If smoke is present, stay low to the floor.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 2, action: 'Alert others on your way out', details: 'Shout "FIRE" and knock on doors. Pull fire alarm if available.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 3, action: 'Check doors before opening', details: 'Use the back of your hand to feel if the door or handle is hot. If hot, do NOT open — find another exit.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 4, action: 'Proceed to an outdoor assembly point', details: 'Stay at least 50m away from the building. Do NOT go back inside for any reason.', timeframe: 'Immediately', type: 'prevention' },
    ],
    urgent: [
      { priority: 1, action: 'Use fire extinguisher if safe to do so', details: 'Only attempt if fire is small (size of a wastebasket) and you have a clear exit path. Use PASS method: Pull, Aim, Squeeze, Sweep.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 2, action: 'Shut off gas and electricity', details: 'If safe, turn off the main gas valve and electrical mains to prevent escalation.', timeframe: 'Within 2 minutes', type: 'prevention' },
      { priority: 3, action: 'Close doors to contain fire', details: 'When leaving a room where fire is present, close the door to slow the spread of smoke and heat.', timeframe: 'Immediately', type: 'prevention' },
    ],
  },
  animal: {
    urgent: [
      { priority: 1, action: 'Assess animal from a safe distance', details: 'Do NOT touch or move the animal, especially if it appears aggressive, rabid, or severely injured. They may bite out of fear.', timeframe: 'Immediately', type: 'safety' },
      { priority: 2, action: 'Call Blue Cross or PFA Helpline', details: 'Provide exact location, description of the animal, and nature of injury. Send a photo if possible.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 3, action: 'Offer water and shade if safe', details: 'Place a bowl of water nearby but do not force the animal to drink. Provide shade using an umbrella or cardboard.', timeframe: 'Within 10 minutes', type: 'care' },
      { priority: 4, action: 'Keep bystanders away', details: 'Ensure people (especially children) do not crowd or harass the animal, which increases its stress.', timeframe: 'Ongoing', type: 'prevention' },
    ],
    normal: [
      { priority: 1, action: 'Contact local NGO for vaccination/sterilization', details: 'Reporting healthy strays for ABC (Animal Birth Control) programs helps community safety.', timeframe: 'Today', type: 'information' },
      { priority: 2, action: 'Provide food and clean water', details: 'If feeding strays, do so in a clean area away from high traffic to prevent nuisance or accidents.', timeframe: 'Regularly', type: 'care' },
    ],
  },
  disaster: {
    critical: [
      { priority: 1, action: 'EVACUATE to higher ground / safe shelter IMMEDIATELY', details: 'Do not wait. Take essential documents, medications, water. Help elderly, children, and disabled persons first.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 2, action: 'Call NDRF helpline: 011-24363260', details: 'Report the disaster situation, location, number of people affected, and any immediate dangers.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 3, action: 'Move away from damaged structures', details: 'Stay away from buildings with cracks, downed power lines, flooded roads. Go to designated relief camps if available.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 4, action: 'Conserve resources and stay together', details: 'Ration food and water. Keep your phone charged (power banks). Stay with your group. Signal for help using bright clothing or mirrors.', timeframe: 'Ongoing', type: 'prevention' },
      { priority: 5, action: 'Contact family and mark yourself safe', details: 'Use SMS (more reliable than calls during disasters). Use Google Person Finder or social media safety check features.', timeframe: 'When possible', type: 'communication' },
    ],
    urgent: [
      { priority: 1, action: 'Prepare for potential escalation', details: 'Pack an emergency kit: water, food, medicines, documents, flashlight, phone charger. Know your nearest evacuation route.', timeframe: 'Within 1 hour', type: 'prevention' },
      { priority: 2, action: 'Monitor official channels for updates', details: 'Follow NDMA (@ndaborad), IMD (@Aborad_IMD), and local administration on Twitter/X. Tune into All India Radio for updates.', timeframe: 'Ongoing', type: 'information' },
      { priority: 3, action: 'Stock up on essential supplies', details: 'Clean drinking water (10L per person), non-perishable food, first aid kit, batteries, candles, important documents in waterproof bag.', timeframe: 'Today', type: 'prevention' },
    ],
    normal: [
      { priority: 1, action: 'Stay informed about the developing situation', details: 'Check weather forecasts and government advisories. Sign up for local emergency alerts.', timeframe: 'Ongoing', type: 'information' },
      { priority: 2, action: 'Review your emergency preparedness', details: 'Check emergency kit supplies, update family emergency contacts, review evacuation routes from your area.', timeframe: 'Today', type: 'prevention' },
    ],
  },
  weather: {
    urgent: [
      { priority: 1, action: 'Stay indoors and away from windows', details: 'Lightning, high winds, and flying debris are major risks. Unplug sensitive electrical appliances.', timeframe: 'Immediately', type: 'safety' },
      { priority: 2, action: 'Avoid waterlogged areas', details: 'Do NOT walk or drive through flooded roads. 6 inches of moving water can knock you off your feet.', timeframe: 'Ongoing', type: 'prevention' },
      { priority: 3, action: 'Check IMD/State weather bulletins', details: 'Look for color-coded warnings (Red/Orange/Yellow) on the Mausam website or app.', timeframe: 'Hourly', type: 'information' },
    ],
    normal: [
      { priority: 1, action: 'Plan travel according to forecast', details: 'Wait for the weather system to pass before long-distance travel, especially in hill stations (landslide risk).', timeframe: 'Today', type: 'prevention' },
      { priority: 2, action: 'Stock essential medications and food', details: 'During heavy monsoons, supply chains may be disrupted for 24-48 hours.', timeframe: 'By evening', type: 'prevention' },
    ],
  },
  safety: {
    critical: [
      { priority: 1, action: 'Call 100 (Police) or 112 IMMEDIATELY', details: 'If you are in immediate danger, call now. Stay on the line. Give your exact location and describe the threat.', timeframe: 'Immediately', type: 'emergency' },
      { priority: 2, action: 'Move to a safe, public, well-lit area', details: 'Go to the nearest shop, restaurant, or public building. Stay around other people. Do NOT go to isolated areas.', timeframe: 'Immediately', type: 'prevention' },
      { priority: 3, action: 'Alert someone you trust', details: 'Call or text a family member or friend with your live location. Use WhatsApp live location sharing.', timeframe: 'Immediately', type: 'communication' },
      { priority: 4, action: 'Document everything you can', details: 'If safe to do so, note descriptions, vehicle numbers, photos. This is critical evidence for police.', timeframe: 'When safe', type: 'information' },
    ],
    urgent: [
      { priority: 1, action: 'Report to the nearest police station', details: 'File an official complaint/FIR. Ask for a written acknowledgement with diary number.', timeframe: 'Today', type: 'communication' },
      { priority: 2, action: 'Secure your surroundings', details: 'Lock doors and windows, inform neighbors, install safety apps. Consider staying with someone you trust.', timeframe: 'Today', type: 'prevention' },
      { priority: 3, action: 'Preserve all evidence', details: 'Save messages, screenshots, call logs, photos. Do not wash clothes if there was physical contact. These are vital for investigation.', timeframe: 'Immediately', type: 'information' },
    ],
    normal: [
      { priority: 1, action: 'Report the incident to appropriate authorities', details: 'Non-emergency police line, or file an online complaint at your state police website or the CCTNS portal.', timeframe: 'Today', type: 'communication' },
      { priority: 2, action: 'Take preventive safety measures', details: 'Review your daily safety practices, inform trusted contacts, consider personal safety tools and apps.', timeframe: 'This week', type: 'prevention' },
    ],
  },
  health_records: {
    normal: [
      { priority: 1, action: 'Consult with your doctor about these records', details: 'Schedule an appointment to discuss the findings. Bring all related test reports and current medication list.', timeframe: 'This week', type: 'medical' },
      { priority: 2, action: 'Organize and digitize your health records', details: 'Use the Ayushman Bharat Health Account (ABHA) to create a digital health ID and store records securely.', timeframe: 'This week', type: 'information' },
      { priority: 3, action: 'Review medication interactions', details: 'If taking multiple medications, ask your pharmacist or doctor to check for potential drug interactions.', timeframe: 'At next appointment', type: 'medical' },
      { priority: 4, action: 'Set up health monitoring reminders', details: 'Schedule regular check-ups, medication reminders, and follow-up tests as recommended by your doctor.', timeframe: 'This week', type: 'prevention' },
    ],
    urgent: [
      { priority: 1, action: 'Consult a specialist urgently', details: 'These findings suggest you should see a specialist soon. Ask your GP for a referral or visit a nearby hospital.', timeframe: 'Today', type: 'medical' },
      { priority: 2, action: 'Do not stop or change medications without consulting your doctor', details: 'Even if test results seem concerning, continue current medications until your doctor advises otherwise.', timeframe: 'Immediately', type: 'medical' },
      { priority: 3, action: 'Get a second opinion if needed', details: 'For serious diagnoses, it\'s reasonable to consult another specialist. Bring all reports and test results.', timeframe: 'This week', type: 'information' },
    ],
  },
  general: {
    normal: [
      { priority: 1, action: 'Review the situation and identify what type of help you need', details: 'Determine if this is a medical, safety, legal, or informational need. This helps route you to the right resources.', timeframe: 'Immediately', type: 'information' },
      { priority: 2, action: 'Contact relevant authorities or services', details: 'For emergencies: 112. For non-emergencies, contact the relevant helpline or local authority.', timeframe: 'Today', type: 'communication' },
      { priority: 3, action: 'Document the situation', details: 'Write down key details: who, what, when, where. Take photos if relevant. This helps when seeking official help.', timeframe: 'Today', type: 'information' },
    ],
  },
};

/**
 * Severity-specific titles and summaries
 */
const SEVERITY_TEMPLATES = {
  medical: {
    critical: { title: 'Critical Medical Emergency Detected', summary: 'A life-threatening medical situation has been identified from your input. Immediate action is required — call emergency services and begin first aid.' },
    urgent: { title: 'Urgent Medical Attention Needed', summary: 'Your input indicates a medical condition that requires prompt attention. Seek medical care within the next hour and monitor symptoms closely.' },
    normal: { title: 'Medical Consultation Recommended', summary: 'Based on your input, a non-emergency medical consultation is recommended. Schedule a doctor visit and monitor your condition.' },
  },
  accident: {
    critical: { title: 'Severe Accident — Immediate Response Required', summary: 'A serious accident has been reported. Multiple emergency services may be needed. Ensure scene safety and call 112 immediately.' },
    urgent: { title: 'Accident Reported — Action Required', summary: 'An accident situation has been identified. Ensure all parties are safe, document the scene, and contact authorities.' },
    normal: { title: 'Minor Incident Reported', summary: 'A minor accident or incident has been reported. Ensure everyone is safe and document the situation for insurance purposes.' },
  },
  fire: {
    critical: { title: 'CRITICAL FIRE EMERGENCY', summary: 'A serious fire emergency has been detected. Your immediate priority is evacuation. Call 101 or 112 immediately and follow safety protocols.' },
    urgent: { title: 'Fire/Hazard Alert', summary: 'A potential fire or hazardous situation is present. Assess scene safety, contain if possible, and alert authorities.' },
    normal: { title: 'Fire Safety Assessment', summary: 'Analysis complete. Review the fire safety steps below to ensure your surroundings are secure.' },
  },
  animal: {
    urgent: { title: 'Animal Distress / Rescue Needed', summary: 'An animal in distress or potentially dangerous situation has been identified. Prioritize safety and contact professional rescue services.' },
    normal: { title: 'Animal Welfare Assessment', summary: 'General animal welfare situation. Contact local NGOs for ABC programs or routine animal care.' },
  },
  disaster: {
    critical: { title: 'DISASTER ALERT — Evacuate Immediately', summary: 'A critical disaster situation has been detected. Prioritize evacuation and safety. Contact NDRF and follow official guidance.' },
    urgent: { title: 'Disaster Warning — Prepare Now', summary: 'A potential disaster situation is developing. Prepare emergency supplies, review evacuation routes, and stay tuned to official channels.' },
    normal: { title: 'Disaster Preparedness Advisory', summary: 'A weather or disaster-related situation has been flagged. Stay informed through official channels and review your emergency preparedness.' },
  },
  weather: {
    urgent: { title: 'Severe Weather Alert', summary: 'Dangerous weather conditions are occurring or imminent. Seek shelter, avoid floodwaters, and monitor IMD bulletins.' },
    normal: { title: 'Weather Advisory', summary: 'Maintain awareness of weather conditions. Review preparedness plans and stock essential supplies.' },
  },
  safety: {
    critical: { title: 'Immediate Safety Threat Detected', summary: 'Your input indicates an immediate threat to personal safety. Move to a safe area and contact police (100) or emergency services (112) immediately.' },
    urgent: { title: 'Safety Concern — Take Precautions', summary: 'A safety concern has been identified. Report to authorities, secure your surroundings, and alert trusted contacts.' },
    normal: { title: 'Safety Advisory', summary: 'A non-immediate safety concern has been noted. Consider reporting to authorities and taking preventive measures.' },
  },
  health_records: {
    urgent: { title: 'Health Records — Urgent Consultation Needed', summary: 'Analysis of your health records suggests findings that warrant urgent medical consultation. Do not change medications without doctor advice.' },
    normal: { title: 'Health Records Analysis', summary: 'Your health records have been reviewed. A consultation with your healthcare provider is recommended to discuss findings and next steps.' },
  },
  general: {
    normal: { title: 'Situation Assessment Complete', summary: 'Your input has been analyzed. Review the suggested actions below and contact relevant authorities if needed.' },
  },
};

/**
 * Determine severity from text keywords
 */
function determineSeverity(text) {
  const lower = text.toLowerCase();

  const criticalKeywords = [
    'dying', 'unconscious', 'not breathing', 'heart attack', 'stroke',
    'bleeding heavily', 'trapped', 'drowning', 'choking', 'seizure',
    'severe pain', 'collapsed', 'unresponsive', 'cardiac arrest',
    'stabbed', 'shot', 'explosion', 'building collapse', 'tsunami',
    'earthquake', 'kidnapped', 'assault', 'attack', 'help me',
    'can\'t breathe', 'burning', 'electrocuted', 'poisoned', 'on fire',
    'flames', 'trapped in fire',
  ];

  const urgentKeywords = [
    'pain', 'bleeding', 'hurt', 'injured', 'fever', 'vomiting',
    'accident', 'crash', 'broken', 'fracture', 'fell', 'burn',
    'threatening', 'suspicious', 'following', 'stolen', 'robbery',
    'flood', 'storm', 'evacuation', 'warning', 'allergic reaction',
    'high bp', 'high sugar', 'breathing difficulty', 'chest pain',
    'stray dog', 'animal injured', 'gas leak', 'smoke smell',
  ];

  const criticalScore = criticalKeywords.filter(kw => lower.includes(kw)).length;
  const urgentScore = urgentKeywords.filter(kw => lower.includes(kw)).length;

  if (criticalScore >= 1) return 'critical';
  if (urgentScore >= 1) return 'urgent';
  return 'normal';
}

/**
 * Extract key findings from text using keyword analysis
 */
function extractKeyFindings(text, category) {
  const lower = text.toLowerCase();
  const findings = [];

  // People-related findings
  const peoplePatterns = [
    { pattern: /(\d+)\s*(people|persons|children|kids|elderly|injured|trapped)/i, type: 'People involved' },
    { pattern: /(baby|infant|child|elderly|pregnant|disabled)/i, type: 'Vulnerable person' },
  ];

  // Location-related findings
  const locationPatterns = [
    { pattern: /(highway|nh-?\d+|road|street|station|hospital|school|mall|market|bridge)/i, type: 'Location type' },
    { pattern: /(floor|storey|building|apartment|flat)/i, type: 'Structure detail' },
  ];

  // Medical findings
  const medicalPatterns = [
    { pattern: /(blood|bleeding|wound|fracture|breathing|unconscious|fever|pain)/i, type: 'Medical symptom' },
    { pattern: /(diabetes|bp|heart|asthma|allergy|cancer|kidney)/i, type: 'Medical condition' },
    { pattern: /(\d+)\s*(mg|ml|tablet|capsule|dose)/i, type: 'Medication detail' },
  ];

  // Animal/Environmental findings
  const otherPatterns = [
    { pattern: /(dog|cat|cow|snake|monkey|wildlife)/i, type: 'Animal species' },
    { pattern: /(smoke|flames|gas|heat|leak)/i, type: 'Hazard detail' },
  ];

  const allPatterns = [...peoplePatterns, ...locationPatterns, ...medicalPatterns, ...otherPatterns];

  for (const { pattern, type } of allPatterns) {
    const match = text.match(pattern);
    if (match) {
      findings.push({
        finding: `${type}: "${match[0]}" detected in input`,
        confidence: 'medium',
        source: 'Keyword analysis',
      });
    }
  }

  // Always add an input-level finding
  if (findings.length === 0) {
    findings.push({
      finding: `Input classified as ${category} based on content analysis`,
      confidence: 'medium',
      source: 'Pre-classification engine',
    });
  }

  return findings.slice(0, 5);
}

/**
 * Generate warnings based on category and severity
 */
function generateWarnings(category, severity) {
  const warnings = [
    'This analysis was generated locally. For critical situations, always verify with emergency services.',
    'TRIAGE AI is an assistance tool — it does NOT replace professional medical, legal, or emergency advice.',
  ];

  if (severity === 'critical') {
    warnings.unshift('⚠️ CRITICAL: Do NOT rely solely on this app. Call 112 IMMEDIATELY for life-threatening situations.');
  }

  if (category === 'medical') {
    warnings.push('Do not administer medication without proper medical training or prescription.');
  }

  if (category === 'fire') {
    warnings.push('Do NOT use elevators during a fire emergency.');
  }

  return warnings;
}

/**
 * Generate follow-up actions
 */
function generateFollowUp(category, severity) {
  const followUp = [];

  if (severity === 'critical' || severity === 'urgent') {
    followUp.push('Follow up with the hospital/authority for case updates');
    followUp.push('Obtain official reports/documentation for records');
  }

  if (category === 'medical') {
    followUp.push('Schedule a follow-up medical appointment within 48-72 hours');
  }

  if (category === 'fire') {
    followUp.push('Review smoke detector and fire safety plan');
    followUp.push('Check for structural damage before re-entering');
  }

  if (category === 'animal') {
    followUp.push('Monitor animal from a distance until help arrives');
  }

  followUp.push('Save this triage report for your records');

  return followUp;
}

/**
 * Generate a complete smart fallback response when Gemini API is unavailable.
 */
export function generateLocalFallback(input, classification) {
  const text = input.text || '';
  const category = classification.likelyCategory || 'general';
  const severity = determineSeverity(text);

  // Get category and severity-specific templates
  const categoryTemplates = ACTION_TEMPLATES[category] || ACTION_TEMPLATES.general;
  const severityActions = categoryTemplates[severity] || categoryTemplates.normal || ACTION_TEMPLATES.general.normal;

  const titleSummary = SEVERITY_TEMPLATES[category]?.[severity]
    || SEVERITY_TEMPLATES[category]?.normal
    || SEVERITY_TEMPLATES.general.normal;

  const contacts = [
    ...EMERGENCY_CONTACTS.universal,
    ...(EMERGENCY_CONTACTS[category] || EMERGENCY_CONTACTS.general),
  ];

  // Deduplicate contacts by number
  const uniqueContacts = [];
  const seenNumbers = new Set();
  for (const c of contacts) {
    if (!seenNumbers.has(c.number)) {
      seenNumbers.add(c.number);
      uniqueContacts.push(c);
    }
  }

  return {
    severity,
    category,
    title: titleSummary.title,
    summary: titleSummary.summary,
    actions: severityActions,
    emergency_contacts: uniqueContacts,
    key_findings: extractKeyFindings(text, category),
    warnings: generateWarnings(category, severity),
    follow_up: generateFollowUp(category, severity),
    location_relevant: ['medical', 'accident', 'disaster', 'safety', 'fire', 'animal'].includes(category),
    search_queries: [],
  };
}
