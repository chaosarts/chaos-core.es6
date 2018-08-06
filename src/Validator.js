goog.module('app.form.Validator');

const dataset = goog.require('goog.dom.dataset');
const str = goog.require('goog.string');
const {Validatable} = goog.require('chaos.core.Validatable');

/**
 * Represents the type for validator infos
 * @typedef {{name: string, requirement: *, instance: Validator}}
 */
let ValidatorInfo;

/**
 * Represents the type for Validator classes
 * @typedef {function(new:Validator)}
 */
let ValidatorClass;

/**
 * Provides a map, where key is the name of the constructor and value the
 * validator instance.
 * @type {Map<string, Validator>}
 */
let _perClassNameValidatorMap = new Map;

/**
 * Provides a map, where key is the name with which the validator class has been
 * registered and value is the 
 * @type {Map<string, ValidatorClass>}
 */
let _perNameValidatorClassMap = new Map;

/**
 * Provides a map, where key is the id of the validatable and value is the list
 * of validators, which the validatable uses
 * @type {Map<string, Array<ValidatorInfo>>}
 */
let _perIdValidatorMap = new Map;

/**
 * Indicates if overriding a validator is allowed
 * @type {boolean}
 */
let _allowOverride = true;

/**
 * Id generator count 
 * @type {number}
 */
let _idCount = 0;


/**
 * This is the base class for form validators. A validator class is associated
 * with one or more names. For an input validatable we use this name as data 
 * attribute name. The presence of a value for this attribute depends on whether
 * the validator requires one or not. 
 *
 * For example, a validator, for generic regular expression validation, may need
 * the expression in the data attribute. A validator which marks an input as
 * required only need to be present without data attribute value. 
 * 
 * A data attribute name, with which a validator is registered, and its 
 * attribute value is called the requirement name and value. Additionally a 
 * validator can specify the data type of the requirement value, so that the 
 * validation process can parse the value beforehand before validating the 
 * value of the input.
 */
class Validator 
{

    /**
     * Public static accessor to determine whether overriding validators on
     * registering is allowed or not 
     * @public
     * @nocollapse
     * @return {boolean}
     */
    static get _allowOverride () 
    {
        return _allowOverride;
    }


    /**
     * Public accessor to get the list of registered validator names
     * @public
     * @return {Array<string>}
     */
    static get names ()
    {
        let names = new Array();
        for (let key of _perNameValidatorClassMap.keys())
            names.push(key);
        return names;
    }


    /**
     * Returns the singleton instance of the validator class
     * @final
     * @public
     * @param {Function} ValidatorClass
     * @return {Validator}
     * @nocollapse
     */
    static getSingletonByClass (ValidatorClass) 
    {
        if (!_perClassNameValidatorMap.has(ValidatorClass.name)) 
            _perClassNameValidatorMap.set(ValidatorClass.name, new ValidatorClass);
        
        return /** @type {Validator} */ (_perClassNameValidatorMap.get(ValidatorClass.name));
    }


    /**
     * Returns the validator class by name
     * @final
     * @public
     * @param {string} requirementName
     * @return {?Function}
     * @nocollapse
     */
    static getValidatorClassByName (requirementName) 
    {
        let key = str.toCamelCase(requirementName);
        return _perNameValidatorClassMap.has(key) ? 
            _perNameValidatorClassMap.get(key) : null;
    }


    /**
     * Returns the singleton instance of a validator by requirement name
     * @final
     * @public
     * @return {Validator}
     * @nocollapse
     */
    static getSingletonByName (requirementName) 
    {
        let ValidatorClass = Validator.getValidatorClassByName(requirementName);
        return ValidatorClass ? Validator.getSingletonByClass(ValidatorClass) : 
            null;
    }


    /**
     * Adds a validator for automated validation
     * @final
     * @public
     * @param {Function} ValidatorClass
     * @param {...string} name
     * @nocollapse
     */
    static add (ValidatorClass, name) 
    {
        try 
        {
            /* Checking several pre conditions first, like the Class of the
            first argument and the number of names passed. */

            if (!(ValidatorClass.prototype instanceof Validator)) 
            {
                throw new TypeError(`Class ${ValidatorClass.name} is not a ` + 
                    `subclass of Validator`);
            }

            let names = Array.from(arguments).slice(1)
                .map(argument => argument.trim())
                .filter(argument => argument != '');

            if (names.length == 0)
            {
                throw new TypeError(`No names passed for ` + 
                    `${ValidatorClass.name}`);
            }

            /* Register the validator class for all names passed to the method
            if possible. A validator may be overwritten if the static flag
            '_allowOverride' is set to true. */
        
            do
            {
                let name = str.toCamelCase(names.shift());
                if (_perNameValidatorClassMap.has(name)) 
                {
                    if (!_allowOverride)
                    {
                        console.warn(`Name '${name}' has already been ` + 
                            `registered for a validator class. Overriding is ` + 
                            `disabled.`);
                        continue;
                    }

                    console.warn(`Name '${name}' has already been registered ` + 
                        `for a validator class. Overriding is enabled.`);
                }

                _perNameValidatorClassMap.set(name, ValidatorClass);
            } while (names.length > 0);
        }
        catch (error) 
        {
            console.warn(`Failed to add validator: ${error.message}`, error);
        }
    }


    /**
     * Get the validators for an validatable
     * @final
     * @public
     * @param {(Element|Validatable)} validatable
     * @return {Array<ValidatorInfo>}
     * @nocollapse
     */
    static getByValidatable (validatable) 
    {
        /* This method checks first if the validatable is even a form input 
        validatable. We then either fetch the id attribute or generate a new if 
        none is given. Afterwards we either get the list of validators for the 
        validatable over the map or we collect them by data attributes. */

        if (!validatable.form)
            return new Array;

        /* Fetch or generate an validatable id. This will later be used to set 
        the validator list in the map. */
        let validatableId = validatable.getAttribute('id') || 
            `form-control-${_idCount++}`;

        /* This array is to collect the validators according to the list of 
        data attributes. */
        let validators = new Array;


        /* Check if the validatable has already validators collected*/
        if (!_perIdValidatorMap.has(validatableId))
        {
            /* Look if there is a 'data-validate' attribute, which provides
            a comma-separated list of validators, which do not require a 
            requirement value. We split this list and create non-value
            'data-{validator name}' attributes, to normalize the annotation
            for validators. */

            if (validatable.hasAttribute('data-validate'))
            {
                validatable.getAttribute('data-validate').split(',')
                    .forEach(name => {
                        let key = name.trim();

                        if (key == '')
                            return;

                        validatable.setAttribute(`data-` + 
                            str.toSelectorCase(name), '');
                    });
                validatable.removeAttribute(`data-validate`);
            }


            /* Now iterate through all data attributes and see if there is a
            Validator class registered with given name. The name will be infered
            by removing the prefix 'data' and converting the rest from dash
            to camel case scheme. We intentionally do not use dataset.get or
            dataset.getAll, since 'validatable' might be a component. */

            validators = /** @type {Array<ValidatorInfo>}*/ 
                (Array.from(/** @type {Iterable<Attr>!} */ (validatable.attributes))
                    .map(attribute => {
                        if (!/^data\-/.test(attribute.name))
                            return null;

                        let validatorName = str.toCamelCase(attribute.name.substr(5));
                        let instance = Validator.getSingletonByName(validatorName);

                        if (null == instance)
                            return null;

                        return {
                            'name': validatorName,
                            'requirement': instance.parseRequirement(validatorName, attribute.value),
                            'instance': instance
                        };
                    })
                    .filter(validatorInfo => null != validatorInfo));


            /* If at least one validator has been collected for the validatable, 
            we set an entry for it where the key is the id of the validatable we
            retrieved or generated earlier and the value is the list of 
            validators. If we try to get the validators for the same validatable
            again, we simply retrieve them from the map. */

            if (validators.length > 0) 
            {
                validatable.setAttribute('id', validatableId);
                _perIdValidatorMap.set(validatableId, validators);
            }
        }
        else
        {
            /* This method has previously been called successfully on this
            validatable. So we can simply fetch the list of validators from the 
            map.*/

            validators = _perIdValidatorMap.get(validatableId);
        }

        return validators.slice(0);
    }


    /**
     * Validates an validatable if according data attributes has been set.
     * @final
     * @public
     * @param {Validatable} validatable
     * @return {Promise}
     * @nocollapse
     */
    static validate (validatable)
    {
        if (validatable.disabled)
            return Promise.resolve([]);
        
        /* We first get the validators for the validatable and iterate through them
        to validate. All results will be collected in an array. Each result of
        a validator is ensured to be a promise. If the validation returns false 
        or a promise that rejects, we return in the subsequent promise the 
        name of the validator, otherwise null. We ensure that each promise for
        a validator resolves. */

        let validators = /** @type {Array<ValidatorInfo>} */ 
            (Validator.getByValidatable(validatable));

        /* If we have no validators, we immediatley resolve with an empty array, 
        which indicates no errors for this validatable. */
        if (validators.length == 0)
            return Promise.resolve([]);


        /* We collect all results as promises in an array, which will resolve */
        let promises = new Array;

        while (validators.length > 0) 
        {
            /** @type {?Promise} */
            let promise = null;

            /** @type {{name: string, instance: Validator, requirement: *}} */
            let validator = validators.shift();
            
            try 
            {
                /* Execute the validation and ensure the result to be a 
                promise */
                let validationResult = validator['instance'].validate(validatable, 
                    validator['name'], validator['requirement']);
                
                promise = Promise.resolve(validationResult);
            }
            catch (error)
            {   
                /* If an exception is thrown during validation, we consider it
                as an validation error. */
                promise = Promise.resolve(validator['name']);    
                console.warn(error);
            }

            /* In some cases the validation may return a promise itself 
            over which we have no control, if it either resolves or rejects. 
            Therefore, we ensure the promise pushed to the promise array always
            resolves. */

            promises.push(promise.then(
                (valid) => {
                    return valid ? null : validator['name'];
                },
                (reason) => {
                    console.warn(`Validation failed: ${reason}`);
                    return validator['name'];
                }
            ));
        }

        return Promise.all(promises)
            .then(results => {
                return results.filter(result => result != null)
            });
    }


    /**
     * Public accessor to get the string of the data type to use to parse the
     * value of the requirement, with which the validator has been fetched.
     * Default is 'string'.
     *
     * @public
     * @return {string}
     * @nocollapse
     */
    getRequirementType (requirementName, requirementValue)
    {
        return 'string';
    }


    /**
     * Parses the value of requirementValueand returns the result. 
     * As explained above, an input is connected to a validator by data
     * attributes. The name and the value of the attribute, that invokes to 
     * fetch an validator is called a requirement. The requirement value is 
     * always a string by default (Element.getAttribute()) and may need to be
     * parsed. The type of parsing depends on the requirement type, which can be 
     * get by the property requirementType.
     *
     * @public
     * @param {string} requirementName The name of the data attribute of the 
     *      validatable to validate.
     * @param {string} requirementValue The value set for the data attribute of 
     *      the validatable to validate
     * @throws {TypeError}
     */
    parseRequirement (requirementName, requirementValue) 
    {
        switch (this.getRequirementType(requirementName, requirementValue))
        {
            case 'str':
            case 'string':
                return requirementValue;
            case 'int':
            case 'integer':
                let number = parseInt(requirementValue, 10);
                if (isNaN(number)) 
                {
                    throw new TypeError(`'${requirementValue}' is not a ` + 
                        `number.`);
                }
                return number;
            case 'num':
            case 'number':
            case 'float':
                return parseFloat(requirementValue);
            case 'bool': 
            case 'boolean':
                let value = true;
                if (requirementValue)
                    value = requirementValue.trim().toLowerCase();
                return value != 'false' && value != '0';
            case 'regex': 
            case 'regexp': 
                return new RegExp(requirementValue);
            case 'range':
                let range = requirementValue.replace(/\s*/, '')
                    .split(',')
                    .map((str) => parseFloat(str))
                    .filter((val) => !isNaN(val));

                if (range.length != 2)
                    throw new TypeError('Requirement is not a range.');

                return {'min': range[0], 'max': range[1]}
            default:
                throw new TypeError('Unknown data type for requirement value');
        }
    }


    /**
     * Validates the validatable. The requirement name and value are given to 
     * indicate with which attribute name and value the validator has been
     * fetched and invoked.
     *
     * @public
     * @param {Validatable} validatable
     * @param {string} requirementName The name of the data attribute of the 
     *      validatable to validate.
     * @param {*} requirementValue The value set for the data attribute of the 
     *      validatable to validate
     * @return {Promise|boolean}
     */
    validate (validatable, requirementName, requirementValue) 
    {
        throw new Error('Subclass of Validator must implement _validate');
    }
}


exports = {Validator, ValidatorClass};