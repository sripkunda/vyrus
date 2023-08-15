// Get Dataset
(async function () {
    const fetchAssociations = await fetch("https://cdn.jsdelivr.net/gh/sripkunda/vyrus@latest/src/dataset/disease_symptom_associations.json");
    associations = await fetchAssociations.json();

    const fetchInformation = await fetch("./dataset/disease_information.json");
    information = await fetchInformation.json();
})();

class Vyrus {
    static getPossibleConditions(query) {
        const possibleConditions = {};
        const matchedSymptoms = [];
    
        function addConditions(symptom, weight = 1) {
            if (!symptom) return;
            const conditions = associations[symptom];
            for (const conditionObj of conditions) {
                const conditionName = conditionObj;
                if (conditionName in possibleConditions) {
                    possibleConditions[conditionName] += weight;
                }
                else {
                    possibleConditions[conditionName] = weight;
                }
            }
        }
    
        for (let symptom of Object.keys(associations)) {
            const wordCombinations = Vyrus.getPermutations(symptom.split(" ").filter(Boolean));
            for (const combination of wordCombinations) {
                if (combination && query.toLowerCase().includes(combination.toLowerCase())) {
                    matchedSymptoms.push(symptom);
                    addConditions(symptom);
                }
            }
        }
    
        for (const symptom of Object.keys(associations)) {
            for (const match of matchedSymptoms) {
                if (symptom.toLowerCase().includes(match.toLowerCase()) 
                    && match.toLowerCase() != symptom.toLowerCase()) {
                    addConditions(symptom);
                }
            }
        }
        console.log(possibleConditions);
        return [... new Set(Object.keys(possibleConditions).sort((a, b) => possibleConditions[b] - possibleConditions[a]))];
    }

    // Adapted from https://stackoverflow.com/questions/9960908/permutations-in-javascript
    static getPermutations(words) {
        let result = [];
      
        const permute = (arr, m = []) => {
          if (arr.length === 0) {
            result.push(m.join(" "))
          } else {
            for (let i = 0; i < arr.length; i++) {
              let curr = arr.slice();
              let next = curr.splice(i, 1);
              permute(curr.slice(), m.concat(next))
           }
         }
       }
       permute(words)
       return result;
      }
      
      // Get HTML text from the information dataset
      static desanitizeHTML(input){
        var e = document.createElement('div');
        e.innerHTML = input;
        return e.childNodes[0].nodeValue;
      }
      
      static stringToHTMLElement(str) {
        if (!str) return;
        const template = document.createElement('template');
        template.innerHTML = (Vyrus.desanitizeHTML(str) || str)?.trim();
        return template.content;
      }

      static getConditionInformation(condition, shorten=false) {
        if (!information[condition]) return;
        let shortSummary;
        if (shorten) {
            const firstPara = Vyrus.stringToHTMLElement(information[condition].summary).querySelector("p");
            if (firstPara) {
                shortSummary = firstPara.innerHTML;
    
                // Split summary into sentences
                // (from https://stackoverflow.com/questions/18914629/split-string-into-sentences-in-javascript)
                const sentences = shortSummary.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    
                // If the last character in the last sentence is not a period, remove it.
                // This removes sentence fragments leading to bullet pointed lists that will not be displayed
                if (sentences[sentences.length - 1].slice(-1) != ".") {
                    sentences.pop();
                    shortSummary = sentences.join(" ");
                }
            }
        }

        return {
            name: Vyrus.stringToHTMLElement(information[condition].name).textContent,
            summary: shortSummary || Vyrus.desanitizeHTML(information[condition].summary),
            url: information[condition].url
        }
      }

      static getShortConditionInformation = (condition) => Vyrus.getConditionInformation(condition, true);

      static queryToConditionInformation(query, short=true, duplicates=false) {
        const info = Vyrus.getPossibleConditions(query).map(x => Vyrus.getConditionInformation(x, short)).filter(Boolean);
        const indices = [];
        return [...new Set(info.map((i, x) => {
            indices.push(i);
            return i.name;
        }))].map((x, i) => info[i]);
      }

}