// typex.js
// Type-Extensions X JS
// by Cory Watson
(function (global, undef) {
	'use strict';
    
    var u = (function () {
        function noop() {}

        function dflt(option, fallback) {
            return option === undef ? fallback : option;
        }

        var type = (function () {
            var ObjectToString = Object.prototype.toString;
            var typeNameMap = {
                '[object Undefined]': 'undefined',
                '[object Null]': 'null',
                '[object Object]': 'object',
                '[object Array]': 'array',
                '[object Function]': 'function',
                '[object String]': 'string',
                '[object Number]': 'number',
                '[object Boolean]': 'boolean',
                '[object RegExp]': 'regexp',
                '[object Arguments]': 'arguments',
                '[object Math]': 'math',
                '[object Window]': 'window'
            };

            return function type(value) {
                return typeNameMap[ObjectToString.call(value)] || '';
            };
        }());
        
        function eachInArray(arr, fn) {
            for (var i = 0, l = arr.length; i < l; i++) {
                if (fn(arr[i], i, arr) === false) {
                    return;
                }
            }
        }
        
        var has = (function () {
            var ObjectHas = Object.prototype.hasOwnProperty;

            return function has(obj, key) {
                return ObjectHas.call(obj, key);
            };
        }());

        function eachInObject(obj, fn) {
            for (var key in obj) {
                if (has(obj, key) && fn(obj[key], key, obj) === false) {
                    return;
                }
            }
        }

        var eachMap = {
            'object': eachInObject,
            'array': eachInArray,
            'arguments': eachInArray
        };

        function each(values, fn) {
            return (eachMap[type(values)] || noop)(values, fn);
        }

        function reduce(obj, fn, memo) {
            each(obj, function (value, key, obj) {
                memo = fn(memo, value, key, obj);
            });

            return memo;
        }

        function mapArray(arr, fn) {
            var result = [];

            eachInArray(arr, function (value, i, arr) {
                result[i] = fn(value, i, arr);
            });

            return result;
        }

        function mapObject(obj, fn) {
            var result = {};

            eachInObject(obj, function (value, key, obj) {
                result[key] = fn(value, key, obj);
            });

            return result;
        }

        var mapMap = {
            'object': mapObject,
            'array': mapArray,
            'arguments': mapArray
        };

        function map(values, fn) {
            return (mapMap[type(values)] || noop)(values, fn);
        }

        function mergeArrays(target) {
            return reduce(arguments, function (memo, arr, i) {
                if (i !== 0) {
                    memo.push.apply(memo, arr);
                }

                return memo;
            }, target);
        }

        function mergeObjects(target) {
            return reduce(arguments, function (memo, obj) {
                if (target !== obj) {
                    eachInObject(obj, function (value, key) {
                        memo[key] = value;
                    });
                }

                return memo;
            }, target);
        }

        var mergeMap = {
            'object': mergeObjects,
            'array': mergeArrays,
            'arguments': mergeArrays
        };

        function merge(values) {
            return (mergeMap[type(values)] || noop).apply(null, arguments);
        }

        return {
            noop: noop,
            dflt: dflt,
            type: type,
            has: has,

            each: each,
            reduce: reduce,
            map: map,
            merge: merge
        };

    }());

	var dflt = u.dflt;

	var errorHandler = function (e) {
        throw new Error(e);
    };

	var _typeLib = {};
	var orRegex = /^\s*(.*?)\s*\bor\b\s*(.*?)\s*$/; // 'A or B'
	var andRegex = /^\s*(.*?)\s*\band\b\s*(.*?)\s*$/; // 'A and B'
	var arrayRegex = /^\s*(.*?)\barray\s*$/; // 'A array'
	var notRegex = /^\s*not\b\s*(.*?)\s*$/; // 'not A'

	function testType(name, value) {
		var subName;

		name = formatType(name);

		if (_typeLib[name]) {
			return _typeLib[name](value);
		} else {
			name = parseParens(name);

			if (subName = orRegex.exec(name)) {
				addType(name, function testOr(subValue) {
					return testType(subName[1], subValue) ||
						testType(subName[2], subValue);
				});

				return testType(name, value);
			} else if (subName = andRegex.exec(name)) {
				addType(name, function testAnd(subValue) {
					return testType(subName[1], subValue) &&
						testType(subName[2], subValue);
				});

				return testType(name, value);
			} else if (subName = arrayRegex.exec(name)) {
				addType(name, function testArray(subValue) {
					return testArrayType(subName[1], subValue);
				});

				return testType(name, value);
			} else if (subName = notRegex.exec(name)) {
				addType(name, function testNot(subValue) {
					return !testType(subName[1], subValue);
				});

				return testType(name, value);
			} else {
				errorHandler('No type named "' + name + '" has been defined.');
			}
		}
	}

	function testArrayType(name, arr) {
		if (!testType('array', arr)) { return false; }

		for (var i = 0, l = arr.length; i < l; i++) {
			if (!testType(name, arr[i])) {
				return false;
			}
		}

		return true;
	}

	function addType(name, test, override) {
		if (override || testType('undefined', _typeLib[name])) {
			if (testType('function', test)) {
				return (_typeLib[name] = test);
			} else if (testType('string', test)) {
				return (_typeLib[name] = function testAliasType(value) {
					return testType(test, value);
				});
			} else {
				return errorHandler('Type definition for "' + name +
                    '" requires a test function or an alias string.');
			}
		}

		return errorHandler('A type called "' + name + '" already exists.');
	}

	var ptName = (function () {
        var ptCounter = 0;

        return function ptName() {
            return '_|_parenthetical_|_type_|_' + ptCounter++ + '_|_';
        };
    }());

	var emptyEdgeFormatRegex = /^\s*(.*?)\s*$/;
	function formatEdges(str) {
        return str
            .replace(/^\s*/, '')
            .replace(/\s*$/, '');
		//return emptyEdgeFormatRegex.exec(str)[1];
	}

	var orFormatRegex = /\|\|/g; // ||
	var andFormatRegex = /&&/g; // &&
	var notFormatRegex = /!/g; // !
	var arrayFormatRegex = /\[\]/g; // []
	var emptyRightFormatRegex = /(\w)\s+(\W)/g; // 'A )'
	var emptyLeftFormatRegex = /(\W)\s+(\w)/g; // ') A'
	var spaceFormatRegex = /\s+/g; // whitespace

	function formatType(typeName) {
		return formatEdges(
			typeName
            .replace(orFormatRegex, ' or ')
            .replace(andFormatRegex, ' and ')
            .replace(notFormatRegex, ' not ')
            .replace(arrayFormatRegex, ' array ')
            .replace(emptyRightFormatRegex, '$1$2')
            .replace(emptyLeftFormatRegex, '$1$2')
            .replace(spaceFormatRegex, ' ')
		);
	}

	var parensRegex = /\(([^\(\)]*)\)/; // 'something ( A ) something'
	var parenParseLib = {};

	function parseParens(exp) {
		var parts = parensRegex.exec(exp);
		if (!parts) { return exp; }

		if (parenParseLib[exp]) {
			return parenParseLib[exp];
		}

		var name = ptName();
		var outer = formatEdges(exp.replace(parensRegex, ' ' + name + ' '));
		addType(exp, outer);
		addType(name, parts[1]);

		return (parenParseLib[exp] = parseParens(outer));
	}

	function parseRuleDescriptor(ruleDescriptor) {
		if (testType('string or object', ruleDescriptor)) {
			return new Rule(ruleDescriptor);
		} else if (testType('array', ruleDescriptor) && ruleDescriptor.length === 2) {
			return new Rule(ruleDescriptor[0], ruleDescriptor[1]);
		}

		errorHandler('Improper overload rule descriptor: ' + String(ruleDescriptor));
	}

	function makeRules(ruleDescriptors) {
		if (!testType('array', ruleDescriptors)) {
			errorHandler('Improper overload rule descriptors: ' + String(ruleDescriptors));
		}

		return u.map(ruleDescriptors, parseRuleDescriptor);
	}

	function makeRoutes(routeDescriptors) {
		var result = [], ruleDescriptors, first, prev;

		if (!testType('array', routeDescriptors)) {
			errorHandler('Improper overload route descriptors: ' + String(routeDescriptors));
		}

		u.each(routeDescriptors, function parseRouteDescriptor(value, i) {
			if (i % 2 === 0 && testType('array', value)) {
				ruleDescriptors = value;
				return;
			} else if (i % 2 === 1 && testType('function', value)) {
				first = first || value;
				value.first = first;
				value.prev = prev;
				prev = value;
				result.push(new Route(ruleDescriptors, value));
				return;
			}

			errorHandler('Improper overload route descriptor: ' + String(value));
		});

		return result;
	}

	function overload() {
		var args = u.merge([], arguments);
		var routes = makeRoutes(args);
		var ol = function overloadedFunction() {
            var args = u.merge([], arguments);

            for(var i = 0, l = routes.length; i < l; i++){
                if (routes[i].test(args)) {
                    return routes[i].run(this, args);
                }
            }

            errorHandler('Arguments (' + String(args) + ')' +
                  ' do not conform to any overload: ' +
                  '(' + String(this) + ' calling ' + String(overloadedFunction) + ')');
        };

		ol.toString = function toString() { return String(routes); };
		ol.overload = function addOverloadRoute() {
			var args = u.merge([], arguments);

			u.merge(routes, makeRoutes(args));

			return ol;
		};

		return ol;
	}

	u.each([
	    'string',
	    'number',
	    'boolean',
	    'regexp',
	    'object',
	    'array',
	    'function',
	    'null',
	    'undefined'
	], function addPrimitive(name) {
		_typeLib[name] = function testType(value) {
			return u.type(value) === name;
		};
	});

	addType('any', function () { return true; });
	addType('catchall', 'any');
	addType('defined', 'not undefined');
	addType('unset', 'undefined or null');
	addType('set', 'not unset');
	addType('char', function (value) {
		return testType('string', value) && value.length === 1;
	});
	addType('character', 'char');
	addType('regex', 'regexp');
	addType('numeric', function isNumeric(n) {
		return !isNaN(parseFloat(n));
	});
	addType('int', function isInt(n) {
		return parseInt(n, 10) === n;
	});
	addType('integer', 'int');

	var Rule = function Rule(typeNameOrRuleMap, fallback) {
		if (testType('string', typeNameOrRuleMap)) {
			this._typeName = typeNameOrRuleMap;
		} else if (testType('object', typeNameOrRuleMap)) {
			this._ruleMap = u.map(typeNameOrRuleMap, parseRuleDescriptor);
		} else {
			errorHandler('Improper Rule descriptor:' + String(typeNameOrRuleMap));
		}

		this._fallback = fallback;
	};

	Rule.prototype = {
		test: function test(value) {
			var matchFlag = true, result;

			if (this._typeName && testType(this._typeName, value)) {
				return value;
			} else if (this._ruleMap) {
				if (testType('unset', value)) { value = this._fallback; }

				if (testType('object', value)) {
					result = u.map(this._ruleMap, function (rule, key) {
						var result = matchFlag && rule.test(value[key]);

						if(testType('undefined', result)) {
							matchFlag = false;
						}

						return result;
					});

					if (matchFlag) { return result; }
				}
			} else if (testType('undefined', value)) {
				return this._fallback;
			}
		},
		isMap: function isMap() { return testType('defined', this._ruleMap); },
		toString: function toString() {
			var core;

			if (testType('defined', this._typeName)) {
				core = '"' + this._typeName + '"';
			} else if (testType('defined', this._ruleMap)) {
				core = this._ruleMap.toString();
			}

			if (testType('defined', this._fallback)) {
				return '["' + this._typeName + '", ' + this._fallback + ']';
			}

			return core;
		}
	};

	var Route = function Route(ruleDescriptors, fn) {
		this._rules = makeRules(ruleDescriptors);
		this._fn = fn;
	};

	Route.prototype = {
		test: function test(args) {
			var result = [];
            var rules = this._rules;

			if (args.length > rules.length) {
				return false;
			}

			for (var i = 0; i < rules.length ; i++) {
				result[i] = rules[i].test(args[i]);

				if (result[i] === void 0) {
					return false;
				}
			}

			u.each(result, function assignArgs(value, i) {
				if (rules[i].isMap()) {
					u.merge(args[i], value);
				} else {
					args[i] = value;
				}
			});

			return true;
		},

		run: function run(scope, args) { return this._fn.apply(scope, args); },

		toString: function toString() {
			return '\n[' + String(this._rules) + '],\n' +
			       String(this._fn);
		}
	};

	var setErrorHandler = overload(
		['function'],
		function (func) {
			errorHandler = func;
		}
	);

	//*
	testType.runTest = function overloadTest(causeError) {
		function writeWrap(value) {
			if (X('string', value)) { return '"' + String(value) + '"'; }
			if (X('array', value)) { return '[' + u.map(value, writeWrap) + ']'; }
			if (X('object', value)) { return '{' + u.map(value, writeWrap) + '}'; }
			return String(value);
		}

		X.typelib = _typeLib;

		console.log('Testing Overload');

		console.log('adding ILogger type');

		X.add('ILogger', function (value) {
			return X('function', value.log);
		}, true);

		var ol = overload(
			[],
			function noArgs() {
				this.log('Routed to ()!');
			},

			[{ someNumber: ['number', 0], someString: 'string' }],
			function obj(obj0) {
				this.log('Routed to ({ someNumber: \'number\', someString: \'string\' })!');
				this.log(obj0);
			},

			[{ log :'function' }],
			function obj(obj0) {
				this.log('Routed to ({ log: \'function\' })!');
				obj0.log('Logging this text!');
				this.log('Calling prev!');
				obj.prev.call(this, obj0);
				this.log('Calling first!');
				obj.first.call(this, obj0);
			},

			['int'],
			function i(i0) {
				this.log('Routed to (int)');
				this.log(i0);
			},

			['number'],
			function n(n0) {
				this.log('Routed to (number)!');
				this.log(n0);
				return n0;
			},

			['object', 'number'],
			function objN(obj0, n0) {
				this.log('Routed to (object, number)!');
				this.log(obj0, n0);
			},

			['undefined[]'],
			function undefarr(undefarr0) {
				this.log('Routed to (undefined array)!');
				this.log(undefarr0);
			}
		);

		console.log('\ncreated overload function: ', String(ol));

		var oltest = function () {
			var args = u.merge([], arguments);
			console.log('\ncalling with (' + u.map(args, writeWrap) + ')');
			console.log('Returned: ', ol.apply(console, args));
		};

		console.log('\ncreated overload function wrapper: ', String(oltest));

		oltest({}, 5);
		oltest({ someNumber: 22, someString: 'Hi!' });
		oltest({ someString: 'Bye!' });
		oltest();
		oltest(2);
		oltest(2.5);
		oltest([undef, undef, undef, undef, undef, undef, undef, undef]);
		oltest(console);

		if (causeError) {
			console.log('\nIntentionally Causing an Error');
			oltest('Greetings.');
		}

		return ol;
	};
	//*/

	// public API //
    
    testType.type = u.type;
	testType.add = addType;
	testType.error = setErrorHandler;
	testType.overload = overload;

	global.X = testType;

}(this));
