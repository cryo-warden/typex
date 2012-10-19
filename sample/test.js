// typex.js
// Type-Extensions x JS
// by Cory Watson
(function (global, _, typex, undef) {
	'use strict';
    
    typex.add('ILogger', function (value) {
        return typex('function', value.log);
    });

	function runTest(causeError) {
		function writeWrap(value) {
			if (typex('string', value)) { return '"' + String(value) + '"'; }
			if (typex('array', value)) { return '[' + _.map(value, writeWrap) + ']'; }
			if (typex('object', value)) { return '{' + _.map(value, writeWrap) + '}'; }
			return String(value);
		}

		console.log('Testing Overload');

		console.log('adding ILogger type');

		var ol = typex.overload(
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
			var args = _.clone(arguments);
			console.log('\ncalling with (' + _.map(args, writeWrap) + ')');
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
	}

	typex.runTest = runTest;

}(this, this._, this.typex));
