/*

# JavaScript Type Extensions #

**This library is now dependency-free and will soon be re-released in a new repo.**

## Type-Checking! ##

*/

(function (X) {
    
var realX = X;

X = _.extend(function (type, value) {
    var result = realX.apply(this, arguments);
    console.log('X("', type, '", ', value, ') -> ', result);
    return result;
}, realX);

    var abc = '123', i = 7;

    X('not undefined', abc); // true
    X('string', abc); // true
    X('numeric', abc); // true
    X('numeric', i); // true
    X('integer', i); // true
    X('char', abc[0]); // true
    X('string or array', abc); // true
    X('string', abc); // true
    X('array', []); // true

    X('string', i); // false
    X('integer', abc); // false
    X('string and array', abc); // false (always false; for any value)
    X('set', null); // false
    X('not undefined'); // false

/*

## Advanced Type-Checking! ##

*/
    X('numeric array', [abc, i, 82, 97, abc, '5.2']); // true
    X('char array', [abc[0], abc[1], abc[2]]); // true
    X('array array', [[], ['Huzzah!']]); // true
    X('array array array', [[[], [], []], [[]]]); // true (and hard to read!)
    X('string array array', [[abc]]); // true
    X('((not set) or number) array', [null, 5, 'abc']); // false

    X('char array', abc); // false (a little odd, but that's how it is)

/*

## Super-Advanced Type-Checking! ##

*/
    X.add('ILogger', function (value) {
        return X('function', value.log);
    }, true);

    X('ILogger array', [console, { log: $.noop }]); // true

/*

## Function Overloading! ##

*/
    var olEx0 = X.overload(
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

/*

## Default Arguments! ##

*/
    var olEx1 = X.overload(
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

/*

## Put It Together! ##

*/
    var olEx2 = X.overload(
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

    var olEx3 = X.overload(
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
        olEx4: X.overload(
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

}(X));
