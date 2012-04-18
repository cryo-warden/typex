/* overload copyright 2012 Cory Watson (http://www.opensource.org/licenses/GPL-3.0) */
(function ($, undef) {
	'use strict';

	var parensRegex = /\(([^\(\)]*)\)/, // 'something ( A ) something'
		orFormatRegex = /\|\|/g, // ||
		andFormatRegex = /&&/g, // &&
		notFormatRegex = /!/g, // !
		arrayFormatRegex = /\[\]/g, // []
		spaceFormatRegex = /\s+/g, // whitespace
		emptyRightFormatRegex = /(\w)\s+(\W)/g, // 'A )'
		emptyLeftFormatRegex = /(\W)\s+(\w)/g, // ') A'
		emptyEdgeFormatRegex = /^\s*(.*?)\s*$/,
		orRegex = /^\s*(.*?)\s*\bor\b\s*(.*?)\s*$/, // 'A or B'
		andRegex = /^\s*(.*?)\s*\band\b\s*(.*?)\s*$/, // 'A and B'
		arrayRegex = /^\s*(.*?)\barray\s*$/, // 'A array'
		notRegex = /^\s*not\b\s*(.*?)\s*$/, // 'not A'
		parenParseLib = {},
		ptCounter = 0,
		Rule,
		Route,
		errorFunc = function (e) { throw new Error(e); },
		setErrorFunc,
		_typeLib = {};

	function testType(name, value) {
		var subName;

		name = formatType(name);

		if (_typeLib[name]) {
			return _typeLib[name](value);
		}
		else {
			name = parseParens(name);

			if (orRegex.test(name)) {
				subName = orRegex.exec(name);

				addType(name, function testOr(subValue) {
					return testType(subName[1], subValue) ||
						testType(subName[2], subValue);
				});

				return testType(name, value);
			}
			else if (andRegex.test(name)) {
				subName = andRegex.exec(name);

				addType(name, function testAnd(subValue) {
					return testType(subName[1], subValue) &&
						testType(subName[2], subValue);
				});

				return testType(name, value);
			}
			else if (arrayRegex.test(name)) {
				subName = arrayRegex.exec(name)[1];

				addType(name, function testArray(subValue) {
					return testArrayType(subName, subValue);
				});

				return testType(name, value);
			}
			else if (notRegex.test(name)) {
				subName = notRegex.exec(name)[1];

				addType(name, function testNot(subValue) {
					return !testType(subName, subValue);
				});

				return testType(name, value);
			}
			else {
				errorFunc('No type named "' + name + '" has been defined.');
			}
		}
	}

	function testArrayType(name, arr) {
		var i;

		if (!testType('array', arr)) {
			return false;
		}

		for (i = 0; i < arr.length; i++) {
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
			}
			else if (testType('string', test)) {
				return (_typeLib[name] = function testAliasType(value) {
					return testType(test, value);
				});
			}
			else {
				return errorFunc('Type definition for "' + name + '" ' +
					  'requires a test function or an alias string.');
			}
		}

		return errorFunc('A type called "' + name + '" already exists.');
	}
	
	function dflt(option, fallback) { return option === undef ? fallback : option; }

	function mapObject(obj, cb) {
		var result = {}, key;

		$.each(obj, function (key, value) {
			result[key] = cb(value, key);
		});

		return result;
	}

	function ptName() { return '_parenthetical_type_' + ptCounter++ + '_'; }

	function formatEdges(str) {
		return emptyEdgeFormatRegex.exec(str)[1];
	}

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

	function parseParens(exp) {
		var outer, name, parts = parensRegex.exec(exp);

		if (!parts) {
			return exp;
		}

		if (parenParseLib[exp]) {
			return parenParseLib[exp];
		}

		name = ptName();
		outer = formatEdges(exp.replace(parensRegex, ' ' + name + ' '));
		addType(exp, outer);
		addType(name, parts[1]);

		return (parenParseLib[exp] = parseParens(outer));
	}

	function parseRuleDescriptor(ruleDescriptor) {
		if (testType('string or object', ruleDescriptor)) {
			return new Rule(ruleDescriptor);
		}
		else if (testType('array', ruleDescriptor) && ruleDescriptor.length === 2) {
			return new Rule(ruleDescriptor[0], ruleDescriptor[1]);
		}

		errorFunc('Improper overload rule descriptor: ' + String(ruleDescriptor));
	}

	function makeRules(ruleDescriptors) {
		if (!testType('array', ruleDescriptors)) {
			errorFunc('Improper overload rule descriptors: ' + String(ruleDescriptors));
		}

		return $.map(ruleDescriptors, parseRuleDescriptor);
	}

	function makeRoutes(routeDescriptors) {
		var result = [], ruleDescriptors, first, prev;

		if (!testType('array', routeDescriptors)) {
			errorFunc('Improper overload route descriptors: ' + String(routeDescriptors));
		}

		$.each(routeDescriptors, function parseRouteDescriptor(i, value) {
			if (i % 2 === 0 && testType('array', value)) {
				ruleDescriptors = value;
				return;
			}
			else if (i % 2 === 1 && testType('function', value)) {
				first = first || value;
				value.first = first;
				value.prev = prev;
				prev = value;
				result.push(new Route(ruleDescriptors, value));
				return;
			}

			errorFunc('Improper overload route descriptor: ' + String(value));
		});

		return result;
	}

	function overload() {
		var args = $.merge([], arguments),
		    routes = makeRoutes(args),
			ol = function overloadedFunction() {
				var args = $.merge([], arguments), i;

				for(i = 0; i < routes.length; i++){
					if (routes[i].test(args)) {
						return routes[i].run(this, args);
					}
				}

				errorFunc('Arguments (' + String(args) + ')' +
					  ' do not conform to any overload: ' +
					  '(' + String(this) + ' calling ' + String(overloadedFunction) + ')');
			};

		ol.toString = function toString() { return String(routes); };
		ol.overload = function addOverloadRoute() {
			var args = $.merge([], arguments);

			$.merge(routes, makeRoutes(args));

			return ol;
		};

		return ol;
	}

	$.each([
	    'string',
	    'number',
	    'boolean',
	    'regexp',
	    'object',
	    'array',
	    'function',
	    'null',
	    'undefined'
	], function addPrimitive(i, name) {
		_typeLib[name] = function testType(value) {
			return $.type(value) === name;
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

	Rule = function Rule(typeNameOrRuleMap, dflt) {
		if (testType('string', typeNameOrRuleMap)) {
			this._typeName = typeNameOrRuleMap;
		}
		else if (testType('object', typeNameOrRuleMap)) {
			this._ruleMap = mapObject(typeNameOrRuleMap, parseRuleDescriptor);
		}
		else {
			errorFunc('Improper Rule descriptor:' + String(typeNameOrRuleMap));
		}

		this._dflt = dflt;
	};

	$.extend(Rule.prototype, {
		test: function test(value) {
			var matchFlag = true, result;

			if (this._typeName && testType(this._typeName, value)) {
				return value;
			}
			else if (this._ruleMap) {
				if (testType('unset', value)) { value = this._dflt; }

				if (testType('object', value)) {
					result = mapObject(this._ruleMap, function (rule, key) {
						var result = matchFlag && rule.test(value[key]);

						if(testType('undefined', result)) {
							matchFlag = false;
						}

						return result;
					});

					if (matchFlag) {
						return result;
					}
				}
			}
			else if (testType('undefined', value)) {
				return this._dflt;
			}
		},
		isMap: function isMap() { return testType('defined', this._ruleMap); },
		toString: function toString() {
			var core;

			if (testType('defined', this._typeName)) {
				core = '"' + this._typeName + '"';
			}
			else if (testType('defined', this._ruleMap)) {
				core = this._ruleMap.toString();
			}

			if (testType('defined', this._dflt)) {
				return '["' + this._typeName + '", ' + this._dflt + ']';
			}

			return core;
		}
	});

	Route = function Route(ruleDescriptors, fn) {
		this._rules = makeRules(ruleDescriptors);
		this._fn = fn;
	};

	$.extend(Route.prototype, {
		test: function test(args) {
			var result = [], rules = this._rules, i;

			if (args.length > rules.length) {
				return false;
			}

			for (i = 0; i < rules.length ; i++) {
				result[i] = rules[i].test(args[i]);

				if (result[i] === undef) {
					return false;
				}
			}

			$.each(result, function assignArgs(i, value) {
				if (rules[i].isMap()) {
					$.extend(args[i], value);
				}
				else {
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
	});

	setErrorFunc = overload(
		['function'],
		function (func) {
			errorFunc = func;
		}
	);

	/*
	overload.runTest = function overloadTest(causeError) {
		function writeWrap(value) {
			if (overload.test('string', value)) { return '"' + String(value) + '"'; }
			if (overload.test('array', value)) { return '[' + $.map(value, writeWrap) + ']'; }
			if (overload.test('object', value)) { return '{' + mapObject(value, writeWrap) + '}'; }
			return String(value);
		}

		var ol, oltest;

		overload.typelib = _typeLib;

		console.log('Testing Overload');

		console.log('adding ILogger type');

		overload.add('ILogger', function (value) {
			return overload.test('function', value.log);
		}, true);

		ol = overload(
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

		oltest = function () {
			var args = $.merge([], arguments);
			console.log('\ncalling with (' + $.map(args, writeWrap) + ')');
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

	overload.add = addType;
	overload.test = testType;
	overload.error = setErrorFunc;

	$.overload = overload;

}(jQuery));