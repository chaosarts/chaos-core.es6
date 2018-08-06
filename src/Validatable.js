goog.module('chaos.core.Validatable');

/**
 * @record
 */
class Validatable 
{
    /**
     * Public accessor to get the name of the validatable
     * @public
     * @return {string}
     */
    get name () {return '';}

    /**
     * Public accessor to set the name of the validatable
     * @public
     * @param {string} name
     */    
    set name (name) {}

    /**
     * Public accessor to get the form type of the validatable
     * @public
     * @return {string}
     */
    get type () {return '';}

    /**
     * Public accessor to get the value of the validatable
     * @public
     * @return {string}
     */
    get value () {return '';}

    /**
     * Public accessor to set the value of the validatable
     * @public
     * @param {string} value
     */
    set value (value) {}

    /**
     * Public accessor to get the form of the validatable
     * @public
     * @return {?HTMLFormElement}
     */
    get form () {return null;}

    /**
     * Public accessor to get the list of attributes of the validatable
     * @public
     * @return {(Array<Attr>|NamedNodeMap)}
     */
    get attributes () {return null;}


    /**
     * Indicates, whether the validatable is disabled or not
     * @public
     * @return {boolean}
     */
    get disabled () {}


    /**
     * Determines, whether the validatable has an attribute with given name or
     * not.
     * @public
     * @param {string} name
     * @return {boolean}
     */
    hasAttribute (name) {}


    /**
     * Returns the value of the attribute with given name
     * @public
     * @param {string} name
     * @return {string}
     */
    getAttribute (name) {}


    /**
     * Sets the value for the attribute with given name
     * @public
     * @param {string} name
     * @param {string} value
     */
    setAttribute (name, value) {}


    /**
     * Removes the attribute of given name
     * @public
     * @param {string} name
     */
    removeAttribute (name) {}
}


exports = {Validatable};