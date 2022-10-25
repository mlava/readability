const { convert } = require('html-to-text');
import {syllable} from 'syllable';
var tokenizer = require('sbd');
var myEventHandler = undefined;
var output = '';

export default {
    onload: ({ extensionAPI }) => {
        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Page Readability metrics",
            callback: () => readability(),
        });

        myEventHandler = function (e) {
            if (e.key.toLowerCase() === 'r' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                selectionReadability();
            }
        }
        window.addEventListener('keydown', myEventHandler, false);
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Page Readability metrics'
        });
        window.removeEventListener('keydown', myEventHandler, false);
    }
}

// get selection text
function selectionReadability() {
    var selectedText = '';
    if (window.getSelection) {
        selectedText = window.getSelection();
    } else if (document.getSelection) {
        selectedText = document.getSelection();
    } else if (document.selection) {
        selectedText = document.selection.createRange().text;
    } else return;
    var words = selectedText.toString();
    if (words.length > 1) {
        getReadability(words);
    }
}

async function readability() {
    var startBlock;
    output = '';

    startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
    if (typeof startBlock == 'undefined') { // no focused block
        var pageBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
        var pageBlockInfo = await getBlockInfoByUID(pageBlock, true);
        startBlock = pageBlockInfo[0][0].children[0].uid;
    }

    var blockUIDList = ['' + startBlock + ''];
    var rule = '[[(ancestor ?b ?a)[?a :block/children ?b]][(ancestor ?b ?a)[?parent :block/children ?b ](ancestor ?parent ?a) ]]';
    var query = `[:find  (pull ?block [:block/uid :block/string])(pull ?page [:node/title :block/uid])
                                 :in $ [?block_uid_list ...] %
                                 :where
                                  [?block :block/uid ?block_uid_list]
                                 [?page :node/title]
                                 (ancestor ?block ?page)]`;
    var results = await window.roamAlphaAPI.q(query, blockUIDList, rule);
    var pageUID = results[0][1].uid;
    var page = await flatten(pageUID, null, false);
    getReadability(page);
};

async function getReadability(words) {
    let cleaned = convert(words);
    const regex1 = /\s{1}\*\s{1}/gm;
    var cleaned1 = cleaned.replace(regex1, '');
    const regex2 = /\n/gm;
    var cleaned2 = cleaned1.replace(regex2, ' ');
    let syl = syllable(cleaned2);
    let polysyl = 0;
    let sent = getSentences(cleaned2).length;
    var words = cleaned2.split(" ");
    var wordCount = words.length;
    if (wordCount > 0) {
        for (var i=0; i<words.length; i++) {
            let s = syllable(words[i]);
            if (s > 2) {
                polysyl = polysyl + 1;
            }
        }
    }
    var char = cleaned2.replace(/[^a-z]/gi, "").length;
    var ARI = Math.ceil(aR(char, wordCount, sent));
    var ARI_age = "18-22";
    if (ARI < 2) {
        ARI_age = "5-6"
    } else if (ARI < 3) {
        ARI_age = "6-7"
    } else if (ARI < 4) {
        ARI_age = "7-8"
    } else if (ARI < 5) {
        ARI_age = "8-9"
    } else if (ARI < 6) {
        ARI_age = "9-10"
    } else if (ARI < 7) {
        ARI_age = "10-11"
    } else if (ARI < 8) {
        ARI_age = "11-12"
    } else if (ARI < 9) {
        ARI_age = "12-13"
    } else if (ARI < 10) {
        ARI_age = "13-14"
    } else if (ARI < 11) {
        ARI_age = "14-15"
    } else if (ARI < 12) {
        ARI_age = "15-16"
    } else if (ARI < 13) {
        ARI_age = "16-17"
    } else if (ARI < 14) {
        ARI_age = "17-18"
    }
    var CL = Math.round(cL(char, wordCount, sent)*10)/10;
    var FK = Math.round(fK(wordCount, sent, syl)*10)/10;

    var FRE = fRE(wordCount, sent, syl);
    var FREstring = "5th Grade";
    if (FRE < 10) {
        FREstring = "Professional"
    } else if (FRE < 30) {
        FREstring = "College graduate"
    } else if (FRE < 50) {
        FREstring = "College"
    } else if (FRE < 60) {
        FREstring = "10th to 12th grade"
    } else if (FRE < 70) {
        FREstring = "8th & 9th grade"
    } else if (FRE < 80) {
        FREstring = "7th grade"
    } else if (FRE < 90) {
        FREstring = "6th grade"
    }
    var SMOG = Math.round(smog(polysyl, sent)*10)/10;
    var GF = Math.round(gF(wordCount, sent, polysyl)*10)/10;
    alert("Words: "+wordCount+"\nSyllables: "+syl+"\nPolysyllabic Words: "+polysyl+"\nSentences: "+sent+"\nCharacters: "+char+"\n\nAutomated readability index: "+ARI+" (Age Range: "+ARI_age+")\nColeman–Liau index: "+CL+" (US grade level)\nFlesch–Kincaid grade level: "+FK+" (US grade level)\nFlesch reading ease: "+(Math.round(FRE)*10)/10+" ("+FREstring+")\nGunning fog index: "+GF+" (Years of education required)\nSMOG Index: "+SMOG+" (Years of education required)");
}

function aR(char, wordCount, sent) {
    let AR = (4.71 * (char / wordCount)) +  (0.5 * (wordCount / sent)) - 21.43;
    return AR;
}

function cL(char, wordCount, sent) {
    let CL = 0.0588 * ((char / wordCount) * 100) - 0.296 * ((sent / wordCount) * 100) - 15.8;
    return CL;
}

function fK(wordCount, sent, syl) {
    let FK = 0.39 * (wordCount / sent) + 11.8 * (syl / wordCount) - 15.59;
    return FK;
}

function fRE(wordCount, sent, syl) {
    let FRE = 206.835 - 1.015 * (wordCount / sent) - 84.6 * (syl / wordCount);
    return FRE;
}

function gF(wordCount, sent, polysyl) {
    let GF = 0.4 * (wordCount / sent + 100 * ((polysyl || 0) / wordCount));
    return GF;
}

function smog(polysyl, sent) {
    let SMOG = 3.1291 + 1.043 * Math.sqrt((polysyl || 0) * (30 / sent));
    return SMOG;
}

function getSentences(text) {
    var optional_options = {"sanitize" : true, "newline_boundaries" : true};
    var sentences = tokenizer.sentences(text, optional_options);
    return sentences;
}

// All code below this point is open source code originally written by @TFTHacker (https://twitter.com/TfTHacker), maintained by David Vargas (https://github.com/dvargas92495), and modified a little by me with their permission and blessing.
async function flatten(uid, excludeTag, flattenH) {
    var md = await iterateThroughTree(uid, markdownGithub, flattenH, excludeTag);
    let marked = await RoamLazy.Marked();
    marked.setOptions({
        gfm: true,
        xhtml: false,
        pedantic: false,
    });

    md = md.replaceAll('- [ ] [', '- [ ]&nbsp;&nbsp;['); //fixes odd isue of task and alis on same line
    md = md.replaceAll('- [x] [', '- [x]&nbsp;['); //fixes odd issue of task and alis on same line
    md = md.replaceAll(/\{\{\youtube\: (.+?)\}\} /g, (str, lnk) => {
        lnk = lnk.replace('youtube.com/', 'youtube.com/embed/');
        lnk = lnk.replace('youtu.be/', 'youtube.com/embed/');
        lnk = lnk.replace('watch?v=', '');
        return `<iframe width="560" height="315" class="embededYoutubeVieo" src="${lnk}" frameborder="0"></iframe>`
    });

    //lATEX handling
    md = md.replace(/  \- (\$\$)/g, '\n\n$1'); //Latex is centered
    const tokenizer = {
        codespan(src) {
            var match = src.match(/\$\$(.*?)\$\$/);
            if (match) {
                var str = match[0];
                str = str.replaceAll('<br>', ' ');
                str = str.replaceAll('<br/>', ' ');
                str = `<div>${str}</div>`;
                return { type: 'text', raw: match[0], text: str };
            }
            // return false to use original codespan tokenizer
            return false;
        }
    };

    marked.use({ tokenizer });
    md = marked.parse(md);

    const regex = /<h1 .+<\/h1>/;
    var result = md.replace(regex, '');

    return `<html>\n
          <head>
          </head>
          <body>\n${result}\n
          </body>\n
        </html>`;
}

async function iterateThroughTree(uid, formatterFunction, flatten, excludeTag) {
    var results = await getBlockInfoByUID(uid, true)
    await walkDocumentStructureAndFormat(results[0][0], 0, formatterFunction, null, flatten, excludeTag);
    return output;
}

async function getBlockInfoByUID(uid, withChildren = false, withParents = false) {
    try {
        let q = `[:find (pull ?page
                     [:node/title :block/string :block/uid :block/heading :block/props 
                      :entity/attrs :block/open :block/text-align :children/view-type
                      :block/order
                      ${withChildren ? '{:block/children ...}' : ''}
                      ${withParents ? '{:block/parents ...}' : ''}
                     ])
                  :where [?page :block/uid "${uid}"]  ]`;
        var results = await window.roamAlphaAPI.q(q);
        if (results.length == 0) return null;
        return results;
    } catch (e) {
        return null;
    }
}

async function walkDocumentStructureAndFormat(nodeCurrent, level, outputFunction, parent, flatten, excludeTag) {
    if (typeof nodeCurrent.title != 'undefined') {          // Title of page
        outputFunction(nodeCurrent.title, nodeCurrent, 0, parent, flatten);
    } else if (typeof nodeCurrent.string != 'undefined') { // Text of a block
        // check if there are embeds and convert text to that
        let blockText = nodeCurrent.string;
        // First: check for block embed
        blockText = blockText.replaceAll('\{\{embed:', '\{\{\[\[embed\]\]\:');
        let embeds = blockText.match(/\{\{\[\[embed\]\]\: \(\(.+?\)\)\}\}/g);
        //Test for block embeds
        if (embeds != null) {
            for (const e of embeds) {
                let uid = e.replace('{{[[embed]]: ', '').replace('}}', '');
                uid = uid.replaceAll('(', '').replaceAll(')', '');
                let embedResults = await getBlockInfoByUID(uid, true);
                try {
                    blockText = await blockText.replace(e, embedResults[0][0].string);
                    //test if the newly generated block has any block refs
                    blockText = await resolveBlockRefsInText(blockText);
                    outputFunction(blockText, nodeCurrent, level, parent, flatten, excludeTag);
                    //see if embed has children
                    if (typeof embedResults[0][0].children != 'undefined' && level < 30) {
                        let orderedNode = await sortObjectsByOrder(embedResults[0][0].children)
                        for (let i in await sortObjectsByOrder(embedResults[0][0].children)) {
                            await walkDocumentStructureAndFormat(orderedNode[i], level + 1, (embedResults, nodeCurrent, level) => {
                                outputFunction(embedResults, nodeCurrent, level, parent, flatten, excludeTag)
                            }, embedResults[0][0], parent, flatten)
                        }
                    }
                } catch (e) { }
            }
        } else {
            // Second: check for block refs
            blockText = await resolveBlockRefsInText(blockText);
            outputFunction(blockText, nodeCurrent, level, parent, flatten, excludeTag);
        }
    }
    // If block/node has children nodes, process them
    if (typeof nodeCurrent.children != 'undefined') {
        let orderedNode = await sortObjectsByOrder(nodeCurrent.children)
        for (let i in await sortObjectsByOrder(nodeCurrent.children))
            await walkDocumentStructureAndFormat(orderedNode[i], level + 1, outputFunction, nodeCurrent, flatten, excludeTag)
    }
}

async function markdownGithub(blockText, nodeCurrent, level, parent, flatten, excludeTag) {
    if (flatten == true) {
        level = 0
    } else {
        level = level - 1;
    }

    if (nodeCurrent.title) { output += '# ' + blockText; return; };

    //convert soft line breaks, but not with code blocks
    if (blockText.substring(0, 3) != '```') blockText = blockText.replaceAll('\n', '<br/>');

    if (nodeCurrent.heading == 1) blockText = '# ' + blockText;
    if (nodeCurrent.heading == 2) blockText = '## ' + blockText;
    if (nodeCurrent.heading == 3) blockText = '### ' + blockText;
    // process todo's
    var todoPrefix = level > 0 ? '' : '- '; //todos on first level need a dash before them
    if (blockText.substring(0, 12) == '{{[[TODO]]}}') {
        blockText = blockText.replace('{{[[TODO]]}}', todoPrefix + '[ ]');
    } else if (blockText.substring(0, 8) == '{{TODO}}') {
        blockText = blockText.replace('{{TODO}}', todoPrefix + '[ ]');
    } else if (blockText.substring(0, 12) == '{{[[DONE]]}}') {
        blockText = blockText.replace('{{[[DONE]]}}', todoPrefix + '[x]');
    } else if (blockText.substring(0, 8) == '{{DONE}}') {
        blockText = blockText.replace('{{DONE}}', todoPrefix + '[x]');
    }

    try {
        blockText = roamMarkupScrubber(blockText, false);
    } catch (e) { }


    if (level > 0 && blockText.substring(0, 3) != '```') {
        //handle indenting (first level is treated as no level, second level treated as first level)
        if (parent["view-type"] == 'numbered') {
            output += '    '.repeat(level - 1) + '1. ';
        } else {
            output += '  '.repeat(level) + '- ';
        }
    } else { //level 1, add line break before
        blockText = '\n' + blockText;
    }

    // exclude tags
    if (excludeTag != null) {
        function escapeRegExp(excludeTag) {
            return excludeTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '');
        }
        excludeTag = escapeRegExp(excludeTag);
        var regex = new RegExp("(.*" + excludeTag + ".*)", "g");
        if (!blockText.match(regex)) {
            output += blockText + '  \n';
        }
    } else {
        output += blockText + '  \n';
    }
}

async function sortObjectsByOrder(o) {
    return o.sort(function (a, b) {
        return a.order - b.order;
    });
}

async function resolveBlockRefsInText(blockText) {
    let refs = blockText.match(/\(\(.+?\)\)/g);
    if (refs != null) {
        for (const e of refs) {
            let uid = e.replaceAll('(', '').replaceAll(')', '');
            let results = await getBlockInfoByUID(uid, false);
            if (results) blockText = blockText.replace(e, results[0][0].string);
        }
    }
    return blockText
}

function roamMarkupScrubber(blockText, removeMarkdown = true) {
    if (blockText.substring(0, 9) == "{{[[query" || blockText.substring(0, 7) == "{{query") return '';
    if (blockText.substring(0, 12) == "{{attr-table") return '';
    if (blockText.substring(0, 15) == "{{[[mentions]]:") return '';
    if (blockText.substring(0, 8) == ":hiccup " && blockText.includes(':hr')) return '---'; // Horizontal line in markup, replace it with MD
    blockText = blockText.replaceAll('{{TODO}}', 'TODO');
    blockText = blockText.replaceAll('{{[[TODO]]}}', 'TODO');
    blockText = blockText.replaceAll('{{DONE}}', 'DONE');
    blockText = blockText.replaceAll('{{[[DONE]]}}', 'DONE');
    blockText = blockText.replaceAll('{{[[table]]}}', '');
    blockText = blockText.replaceAll('{{[[kanban]]}}', '');
    blockText = blockText.replaceAll('{{mermaid}}', '');
    blockText = blockText.replaceAll('{{word-count}}', '');
    blockText = blockText.replaceAll('{{date}}', '');
    blockText = blockText.replaceAll('{{diagram}}', '');
    blockText = blockText.replaceAll('{{POMO}}', '');
    blockText = blockText.replaceAll('{{slider}}', '');
    blockText = blockText.replaceAll('{{TaoOfRoam}}', '');
    blockText = blockText.replaceAll('{{orphans}}', '');
    blockText = blockText.replace('::', ':');                      // ::
    blockText = blockText.replaceAll(/\(\((.+?)\)\)/g, '$1');      // (())
    blockText = blockText.replaceAll(/\[\[(.+?)\]\]/g, '$1');      // [[ ]]  First run
    blockText = blockText.replaceAll(/\[\[(.+?)\]\]/g, '$1');      // [[ ]]  second run
    blockText = blockText.replaceAll(/\[\[(.+?)\]\]/g, '$1');      // [[ ]]  second run
    // blockText = blockText.replaceAll(/\$\$(.+?)\$\$/g, '$1');      // $$ $$
    // blockText = blockText.replaceAll(/\B\#([a-zA-Z]+\b)/g, '$1');  // #hash tag
    blockText = blockText.replaceAll(/\{\{calc: (.+?)\}\}/g, function (all, match) {
        try { return eval(match) } catch (e) { return '' }
    });
    // calc functions  {{calc: 4+4}}
    if (removeMarkdown) {
        blockText = blockText.replaceAll(/\*\*(.+?)\*\*/g, '$1');    // ** **
        blockText = blockText.replaceAll(/\_\_(.+?)\_\_/g, '$1');    // __ __
        blockText = blockText.replaceAll(/\^\^(.+?)\^\^/g, '$1');    // ^^ ^^
        blockText = blockText.replaceAll(/\~\~(.+?)\~\~/g, '$1');    // ~~ ~~
        blockText = blockText.replaceAll(/\!\[(.+?)\]\((.+?)\)/g, '$1 $2'); //images with description
        blockText = blockText.replaceAll(/\!\[\]\((.+?)\)/g, '$1');         //imags with no description
        blockText = blockText.replaceAll(/\[(.+?)\]\((.+?)\)/g, '$1: $2');   //alias with description
        blockText = blockText.replaceAll(/\[\]\((.+?)\)/g, '$1');           //alias with no description
        blockText = blockText.replaceAll(/\[(.+?)\](?!\()(.+?)\)/g, '$1');    //alias with embeded block (Odd side effect of parser)
    } else {
        blockText = blockText.replaceAll(/\_\_(.+?)\_\_/g, '\_$1\_');    // convert for use as italics _ _
    }
    return blockText;
}