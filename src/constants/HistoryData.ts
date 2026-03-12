// data/demoHistoryData.ts

const randomNames = [
  'Jean Makiese', 'Merveille Kalala', 'Patrick Lumu', 'Gloria Banza',
  'Eric Bondo', 'Annie Tshibola', 'Kevin Lelo', 'Sarah Katanga',
  'Michel Mbuyi', 'Linda Ilunga'
];

const generateRandomDate = () => {
  const start = new Date(2025, 6, 1); // July 1st, 2025
  const end = new Date(2025, 7, 7); // August 7th, 2025
  const date = new Date(+start + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
};

const generateReceiptNumber = () => {
  const part1 = Math.random().toString(36).substring(2, 5).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${part1}${Math.floor(100 + Math.random() * 900)}/${part2}${Math.floor(10 + Math.random() * 90)}`;
};

const generateInputCode = () => {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += Math.floor(1000 + Math.random() * 9000) + ' ';
  }
  return code.trim();
};

const demoHistoryData = Array.from({ length: 50 }).map(() => {
  const name = randomNames[Math.floor(Math.random() * randomNames.length)];
  const meterNumber = Math.floor(10000000000 + Math.random() * 89999999999).toString();
  const receiptNumber = generateReceiptNumber();
  const totalUnits = Math.floor(20 + Math.random() * 100);
  const amountPaid = totalUnits * 150; // Exemple : 150 FC par unité
  const inputCode = generateInputCode();
  const createdAt = generateRandomDate();
  const updatedAt = new Date(new Date(createdAt).getTime() + 5 * 60000).toISOString(); // +5 min

  return {
    meterNumber,
    customerName: name,
    receiptNumber,
    totalUnits,
    inputCode,
    amountPaid,
    valueInFC: amountPaid,
    createdAt,
    updatedAt,
  };
});

export default demoHistoryData;
