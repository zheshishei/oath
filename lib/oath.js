
// Since objects only compare === to the same object (i.e. the same reference)
// we can do something like this instead of using integer enums because we can't
// ever accidentally compare these to other values and get a false-positive.
//
// For instance, `rejected === resolved` will be false, even though they are
// both {}.
var rejected = {}, resolved = {}, waiting = {};

// This is a promise. It's a value with an associated temporal
// status. The value might exist or might not, depending on
// the status.
var Promise = function (value, status) {
  this.value = value;
  this.status = status || waiting;
  this.successCallbacks = [];
  this.failureCallbacks = [];
};
Promise.prototype.constructor = Promise;


// The user-facing way to add functions that want
// access to the value in the promise when the promise
// is resolved.
Promise.prototype.then = function (success, _failure) {
  //wrap success function in an anonymous function
  //in order decide which return to pass on
  var deferred = new Deferred();
  var propogateResolution = function(promise) {
    if (success) {
      var ret = success(promise.value);
      if(ret instanceof Promise) {
        var returnedPromise = ret;
        returnedPromise.then(
          function() {
            deferred.resolve(returnedPromise.value);
          },
          function() {
            deferred.reject(returnedPromise.value);
          }
        );
      } else {
        var returnedValue = ret;
        deferred.resolve(returnedValue);
      }
    } else {
      deferred.resolve(promise.value);
    }
  };
  this.successCallbacks.push(propogateResolution);

  // this.successCallbacks.push(success);
  var propogateRejection = function(promise) {
    if(_failure) {
      _failure(promise.value);
    }
    deferred.reject(promise.value);
  }

  this.failureCallbacks.push(propogateRejection);
  return deferred.promise;
};


// The user-facing way to add functions that should fire on an error. This
// can be called at the end of a long chain of .then()s to catch all .reject()
// calls that happened at any time in the .then() chain. This makes chaining
// multiple failable computations together extremely easy.

Promise.prototype.catch = function (failure) {
  // this.failureCallbacks.push(function(promise) {
  //   failure(promise.value);
  // });
  return this.then(undefined, failure);
};



// This is the object returned by defer() that manages a promise.
// It provides an interface for resolving and rejecting promises
// and also provides a way to extract the promise it contains.
var Deferred = function (promise) {
  this.promise = promise || new Promise();
};
Deferred.prototype.constructor = Deferred;

// Resolve the contained promise with data.
//
// This will be called by the creator of the promise when the data
// associated with the promise is ready.
Deferred.prototype.resolve = function (data) {
  this.promise.value = data;
  this.promise.status = resolved;
  this.promise.successCallbacks.forEach(function(callback) {
    callback(this.promise);
  }.bind(this));
  // .reduce(function(accum, callback) {
  //   return callback(accum);
  // });
  return this.promise.value;
};

// Reject the contained promise with an error.
//
// This will be called by the creator of the promise when there is
// an error in getting the data associated with the promise.
Deferred.prototype.reject = function (error) {
  this.promise.value = error;
  this.promise.status = rejected;
  this.promise.failureCallbacks.forEach(function(callback) {
    callback(this.promise);
  }.bind(this));
};

// The external interface for creating promises
// and resolving them. This returns a Deferred
// object with an empty promise.
var defer = function () {
  return new Deferred();
};

var promisify = function(fnc) {
  var deferred = defer();
  return function(val) {
    fnc(val,function(err,val) {
      if(err)
        deferred.reject(err);
      else
        deferred.resolve(val);
    });
    return deferred.promise;
  };
}

module.exports.defer = defer;
module.exports.promisify = promisify;

