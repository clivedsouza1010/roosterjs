import getTagOfNode from '../utils/getTagOfNode';
import { ListType } from 'roosterjs-editor-types';

/**
 * Get list type from a list element. The result will be either Ordered or Unordered ListType
 * @param listElement the element to get list type from
 */
export default function getListTypeFromNode(
    listElement: HTMLOListElement | HTMLUListElement
): ListType.Ordered | ListType.Unordered;

/**
 * Get list type from a DOM node. It is possible to return ListType.None
 * @param node the node to get list type from
 */
export default function getListTypeFromNode(node: Node): ListType;

export default function getListTypeFromNode(node: Node): ListType {
    switch (getTagOfNode(node)) {
        case 'OL':
            return ListType.Ordered;
        case 'UL':
            return ListType.Unordered;
        default:
            return ListType.None;
    }
}