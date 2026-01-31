

export function passwordGenerator(): string {
    const letters = [
        'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
        'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ];    
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    const symbols = ["!", "@", "#", "$", "%", "^", "&", "*"];

    const lettersNumbersSymbols = [...letters, ...numbers, ...symbols];

    
    let password = "";

    //Force one capital letter
    const uppercaseLetters = letters.slice(26);
    const forcedUpper = uppercaseLetters[Math.floor(Math.random() * uppercaseLetters.length)];
    const forcedSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    password += forcedUpper;
    password += forcedSymbol;

    for(let x = 2; x < 16; x ++) {
        const randomIndex = Math.floor(Math.random() * lettersNumbersSymbols.length);
        password += lettersNumbersSymbols[randomIndex]
    }
    return password;
};