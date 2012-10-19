(function (_, typex) {
    
    var realTypex = typex;

    typex = _.extend(function (type, value) {
        var result = realTypex.apply(this, arguments);
        console.log('running typex', {
            type: type,
            value: value,
            result: result
        });
        return result;
    }, realTypex);

    var abc = '123', i = 7;

    // Type Checking //
    typex('not undefined', abc); // true
    typex('string', abc); // true
    typex('numeric', abc); // true
    typex('numeric', i); // true
    typex('integer', i); // true
    typex('char', abc[0]); // true
    typex('string or array', abc); // true
    typex('string', abc); // true
    typex('array', []); // true

    typex('string', i); // false
    typex('integer', abc); // false
    typex('string and array', abc); // false (always false; for any value)
    typex('set', null); // false
    typex('not undefined'); // false

    // Advanced Type-Checking! //
    typex('numeric array', [abc, i, 82, 97, abc, '5.2']); // true
    typex('char array', [abc[0], abc[1], abc[2]]); // true
    typex('array array', [[], ['Huzzah!']]); // true
    typex('array array array', [[[], [], []], [[]]]); // true (and hard to read!)
    typex('string array array', [[abc]]); // true
    typex('((not set) or number) array', [null, 5, 'abc']); // false

    typex('char array', abc); // false (a little odd, but that's how it is)

    // Super-Advanced Type-Checking! //
    typex.add('ILogger', function (value) {
        return typex('function', value.log);
    }, true);

    typex('ILogger array', [console, { log: function () {} }]); // true
    typex('ILogger array', [{ log: 5 }, console, { log: function () {} }]); // true

    // Function Overloading! //
    var olEx0 = typex.overload(
        ['string'],
        function (str) {
            console.log(str, str, str);
        },
        ['int'],
        function (i) {
            console.log(i+5);
        },
        ['string', 'int'],
        function (str, i) {
            console.log(str, str, str);
            console.log(i+5);
        }
    );

    // Default Arguments! //
    var olEx1 = typex.overload(
        ['string'],
        function (str) {
            console.log(str, str, str);
        },
        ['int'],
        function (i) {
            console.log(i+5);
        },
        [['string', 'Happy!'], ['int', -5]],
        function (str, i) {
            console.log(str, str, str);
            console.log(i+5);
        }
    );

    // Put It Together! //
    var olEx2 = typex.overload(
        ['ILogger', 'string'],
        function (logger, str) {
            logger.log(str, str, str);
        },
        ['ILogger', 'int array'],
        function (logger, iArr) {
            _.each(iArr, function (i) {
                logger.log(i+5);
            });
        }
    );

    var olEx3 = typex.overload(
        ['ILogger', 'string array'],
        function (logger, strArr) {
            _.each(strArr, function (str) {
                logger.log(str);
            });
        },
        ['ILogger', 'int array'],
        function oe3iarr(logger, iArr) {
            return oe3iarr.first.call(this, logger, iArr);
        }
    );

    var obj = {
        a: 5,
        b: 17,
        c: 852.1,
        olEx4: typex.overload(
            ['ILogger', 'int array'],
            function (logger, iArr) {
                var self = this;
                _.each(iArr, function (i) {
                    logger.log(i);
                    logger.log(self.a, self.b, self.c);
                });
            },
            ['ILogger', 'number array'],
            function oe4narr(logger, nArr) {
                return oe4narr.first.call(this, logger, _.map(nArr, function (n) {
                    return 1000 * n;
                }));
            }
        )
    };

}(this._, this.typex));
