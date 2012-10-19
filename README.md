# JavaScript Type Extensions ( typex 0.3.0 ) #

**This library is now dependency-free and will soon be re-released in a new repo.**

## Basic API ##

**typex.get(value)** returns string

Returns the name of the value's basic JavaScript type.

* value can be any type

```js
typex.get(); // 'undefined'
typex.get(void 0); // 'undefined'
typex.get(obj.missingProperty); // 'undefined'
typex.get(function () {}()); // 'undefined'

typex.get(null); // 'null'

typex.get({ a:5 }); // 'object'
typex.get(new Object()); // 'object'
typex.get(new SomeCustomClass()); // 'object'

typex.get([1,2,3]); // 'array'
typex.get(new Array()); // 'array'

typex.get(typex.get); // 'function'
typex.get(new Function()); // 'function'

typex.get('abcdefg'); // 'string'
typex.get(new String()); // 'string'

typex.get(85); // 'number'
typex.get(new Number()); // 'number'
typex.get(NaN); // 'number'; weird, huh?

typex.get(true); // 'boolean'
typex.get(new Boolean()); // 'boolean'

typex.get(new Date()); // 'date'

typex.get(/abc/g); // 'regexp'
typex.get(new RegExp('abc', 'g')); // 'regexp'

typex.get(arguments); // 'arguments'; in a function body

typex.get(Math); // 'math'

typex.get(new Error()); // 'error'

typex.get(window); // 'window'; in a browser

typex.get(global); // 'global'; in node

typex.get(someWeirdHostObject); // ''; unknown types yield the empty string
```

----

**typex(name, value)** returns boolean

Returns true iff the value fits the named type.

* name is a string; name of a type
* value can be any type; value whose type is tested

```js
typex('number', 57); //true
typex('date', 87); // false
typex('falsy', null); // true; also not very useful outside of compound statements
typex('truthy', {}); // true
```

----

**typex.add(name, test)** returns test function

* name is a string
* test could be a function

    **test(value)** returns boolean

    * value can be any type; value whose type is tested

    Returns true iff value is type.

* test could be a string; a type to be aliased

```js
typex.add('ILogger', function (value) {
    return typex('function', value.log);
});

typex.add('Orange', function (value) {
    return value instanceof Orange;
});

typex.add('anyOf', '(not false) array');
typex.add('allOf', 'true array');
```

----

**typex.overload(params0, func0, params1, func1, ..., paramsN, funcN)** returns a function

* paramsI is an array; It describes 
* funcI is a function; funcI will be called when the arguments match corresponding paramsI

    **funcI(...)** returns boolean

    * any arguments can be used, though it's best if they correspond to the types given by paramsI

    Returns a function that, when called, will check its arguments against each paramsI in order. The first paramsI that matches the params will cause the corresponding funcI to be called.

Returns

```js
var words = typex.overload(
    ['string'],
    function (str) {
        return str.split(' ');
    },
    ['array'],
    function (arr) {
        return arr.join(' ');
    }
);
```

----

## Advanced Type-Checking! ##

```js
typex('number array', [1,2,3,4,5]); // true
typex('true array', [
    typex('string', 'blah'),
    typex('numeric', 'blah')
]); // false
typex('(not false) array', [
    typex('string', 'blah'),
    typex('numeric', 'blah')
]); // true
```

----

## Super-Advanced Type-Checking! ##

```js
typex('ILogger array', [console, { log: $.noop }]); // true
typex('(ILogger or Orange) array', [
    console,
    { log: $.noop },
    new Orange(),
    Orange.create()
]); // true, assuming certain things about the Orange class
```

----

## Function Overloading! ##

Works for class methods too.

```js
var SomeClass = function () {
    this.init.apply(this, arguments);
};

SomeClass.prototype = {
    init: typex.overload(
        ['string', 'number'],
        function (name, value) {
            this.name(name);
            this.value(value);
        },
        ['string'],
        function (name) {
            this.init(name, 87);
        },
        ['number'],
        function (value) {
            this.init('default name', value);
        },
        [],
        function () {
            this.init('some name', 87);
        }
    ),
    name: typex.overload(
        [], function () { return this._name; },
        ['string'], function (name) {
            this._name = name;
        },
        ['any'], function (value) {
            this._name = String(value);
        }
    ),
    value: typex.overload(
        [], function () { return this._value; },
        ['number'], function (value) {
            this._value = value;
        },
        ['any'], function (value) {
            this._value = parseFloat(value);
        }        
    )
};
```

----

## Default Arguments! ##
```js
SomeClass.prototype = {
    init: typex.overload(
        [['string', 'default name'], ['number', 87]],
        function (name, value) {
            this.name(name);
            this.value(value);
        },
        ['number'],
        function (value) {
            this.init('default name', value);
        }
    ),
    name: typex.overload(
        [], function () { return this._name; },
        ['string'], function (name) {
            this._name = name;
        },
        [['any', '']], function (value) {
            this._name = String(value);
        }
    ),
    value: typex.overload(
        [], function () { return this._value; },
        ['number'], function (value) {
            this._value = value;
        },
        [['any', '']], function (value) {
            this._value = parseFloat(value);
        }        
    )
};
```

----

## Put It Together! ##

```js
var obj = {
    a: 'this.a value',
    b: 'this.b value',
    c: 'this.c value',
    doStuff: typex.overload(
        ['ILogger', 'int array'],
        function (logger, iArr) {
            var self = this;
            logger.log(self.a, self.b, self.c);
            _.each(iArr, function (i) {
                logger.log(i);
            });
        },
        ['ILogger', 'number array'],
        function oe4narr(logger, nArr) {
            return this.doStuff(logger, _.map(nArr, function (n) {
                return Math.floor(1000 * n);
            }));
        }
    )
};

obj.doStuff(console, [5, 10, 15]);
obj.doStuff(console, [5.5, 10.5, 15.5]);
obj.doStuff({
    log: (function () {
        var logOne = typex.overload(
            ['number'],
            function (x) {
                console.log(10 * x);
            },
            ['string'],
            function (str) {
                console.log('%s, %s, %s', str, str, str);
            }
        );
        
        function logJustOne(value) {
            logOne(value);
        }
        
        return function () {
            _.each(_.toArray(arguments), logJustOne);
        };
    }())
}, [5, 10, 15]);
```

----
