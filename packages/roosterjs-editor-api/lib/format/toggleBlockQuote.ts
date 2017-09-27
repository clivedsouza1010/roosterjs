import execFormatWithUndo from './execFormatWithUndo';
import getFormatState  from './getFormatState';
import getBlockQuoteElement from './getBlockQuoteState';
import { ContentScope, ContentPosition, NodeBoundary } from 'roosterjs-editor-types';
import { unwrap, wrapAll, wrap } from 'roosterjs-editor-dom';
import { Editor, browserData } from 'roosterjs-editor-core';

var ZERO_WIDTH_SPACE = '&#8203;';

export default function toggleBlockQuote(editor: Editor, styler?: (element: HTMLElement) => void): void {
    editor.focus();
    let formatter: () => void = null;
    let formatState = editor ? getFormatState(editor) : null;
    let contentTraverser = editor.getContentTraverser(ContentScope.Selection);
    let range = editor.getSelectionRange();

    if (!formatState || !contentTraverser || !range) {
        return;
    }

    let blockElement = contentTraverser.currentBlockElement;

    if (!formatState.isBlockQuote) {
        formatter = () => {
            let nodes: Node[];
            let startContainer: Node;
            let startOffset: number;
            let isRangeCollapsed = true;

            if (!range.collapsed) { // If selection not collapsed, check and try to wrap nodes in selection
                startContainer = range.startContainer;
                startOffset = range.startOffset;
                isRangeCollapsed = false;
                nodes = [];
                while (blockElement) {
                    // Some of the nodes in selection might already in blockquote, only add the ones not in blockquote
                    if (!getBlockQuoteElement(editor, blockElement.getStartNode())) {
                        nodes = nodes.concat(blockElement.getContentNodes());
                    }
                    blockElement = contentTraverser.getNextBlockElement();
                }
            } else if (blockElement) { // Selection is collapsed and there's content in the block, move the whole block into blockquote
                nodes = blockElement.getContentNodes();
                startContainer = range.startContainer;
                startOffset = range.startOffset;

                // If the only content node is <BR>, we wrap it with <DIV>, otherwise the format will break. This often happens in firefox.
                if (nodes.length == 1 && nodes[0].nodeName == 'BR') {
                    nodes[0] = wrap(nodes[0], '<div></div>') as HTMLDivElement;
                    startContainer = nodes[0];
                    startOffset = NodeBoundary.Begin;
                }
            } else { // Selection is collapsed and blockElment is null, we need to create an empty div. In case of IE and Edge, we insert ZWS to put cursor in the div, otherwise insert BR node
                let div = editor.getDocument().createElement('div');

                if (browserData.isEdge || browserData.isIE) {
                    div.innerHTML = ZERO_WIDTH_SPACE;
                } else {
                    let brNode = editor.getDocument().createElement('br');
                    div.appendChild(brNode);
                }
                editor.insertNode(div, {
                    position: ContentPosition.SelectionStart,
                    updateCursor: true,
                    replaceSelection: true,
                    insertOnNewLine: false,
                });
                startContainer = div.firstChild;
                startOffset = NodeBoundary.Begin;
                nodes = [div];
            }

            let quoteElement = wrapAll(nodes, '<blockquote></blockqupte>') as HTMLQuoteElement;
            if (!!styler) {
                styler(quoteElement);
            }
            updateSelection(range, editor, startContainer, startOffset, isRangeCollapsed);
        };

        if (formatter) {
            execFormatWithUndo(editor, formatter);
        }
    } else { // Current selection is in blockquote, need to unblockquote the selection
        let blockQuoteElements: Node[] = [];

        // Selection may contain multiple blockquotes, check and unblockquote all
        while (blockElement) {
            let containerNode = blockElement.getStartNode();
            let blockQuoteElement = getBlockQuoteElement(editor, containerNode);
            if (blockQuoteElement && blockQuoteElements.indexOf(blockQuoteElement) == -1) {
                blockQuoteElements.push(blockQuoteElement);
            }
            blockElement = contentTraverser.getNextBlockElement();
        }

        let formatter = () => {
            let startContainer = range.startContainer;
            let startOffset = range.startOffset;
            for (let element of blockQuoteElements) {
                unwrap(element);
            }
            updateSelection(range, editor, startContainer, startOffset);
        };
        if (formatter) {
            execFormatWithUndo(editor, formatter);
        }
    }
}

function updateSelection(range: Range, editor: Editor, startContainer: Node, startOffset: number, isRangeCollapsed: boolean = true) {
    if (editor.contains(startContainer)) {
        editor.focus();
        range.setStart(startContainer, startOffset);
        if (isRangeCollapsed) {
            range.collapse(true /*toStart*/);
        }
        editor.updateSelection(range);
    }
}