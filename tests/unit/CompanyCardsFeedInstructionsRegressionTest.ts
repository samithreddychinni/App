import de from '@src/languages/de';
import el from '@src/languages/el';
import en from '@src/languages/en';
import es from '@src/languages/es';
import fr from '@src/languages/fr';
import it from '@src/languages/it';
import ja from '@src/languages/ja';
import nl from '@src/languages/nl';
import pl from '@src/languages/pl';
import ptBR from '@src/languages/pt-BR';
import zhHans from '@src/languages/zh-hans';

describe('CompanyCardsFeedInstructions', () => {
    const locales = [
        {name: 'en', trans: en},
        {name: 'de', trans: de},
        {name: 'el', trans: el},
        {name: 'es', trans: es},
        {name: 'fr', trans: fr},
        {name: 'it', trans: it},
        {name: 'ja', trans: ja},
        {name: 'nl', trans: nl},
        {name: 'pl', trans: pl},
        {name: 'ptBR', trans: ptBR},
        {name: 'zhHans', trans: zhHans},
    ];

    it.each(locales)('has exactly one markdown link in vcf and cdf instructions for %s', ({trans}) => {
        // Given the company card feed instructions for Visa (vcf) and Mastercard (cdf)
        const vcf = trans.workspace.companyCards.addNewCard.enableFeed.vcf;
        const cdf = trans.workspace.companyCards.addNewCard.enableFeed.cdf;

        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

        const vcfLinks = vcf.match(markdownLinkRegex) ?? [];
        const cdfLinks = cdf.match(markdownLinkRegex) ?? [];

        // Then step 1 has the only link (to the setup help article), and step 2 (contact bank) has no link
        expect(vcfLinks.length).toBe(1);
        expect(cdfLinks.length).toBe(1);
    });
});
