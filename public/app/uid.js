(function () {

  var uid = angular.module('uid', []);

  uid.factory('uid', function () {
    var uid = {

      // Cache of used strings. Temporary.
      cache: { '': true },

      // Letterbank
      vowels: 'aeiou',
      consonants: 'bcdfghjklmnpqrstvwxyz',

      /**
       * Generate a random, pronouncable string of length `length`, or 4.
       * The string will always be consonant, vowel, consonant etc.
       *
       * Returns a string.
       */
      generate: function (length) {
        // Make sure that 'this' is always uid
        if (this !== uid) return uid.generate.call(uid, length);
        length = length || 4;
        var str = '', choice;
        // Don't pick one that's already in use
        // TODO make this talk to a server
        while (this.cache[str]) {
          str = '';
          choice = 0;
          // Grow the string to the desired length
          while (str.length < length) {
            str += this.randomFrom([this.consonants, this.vowels][choice]);
            // Flip, flop
            choice = 1 - choice;
          }
        }
        // Don't use this one again
        this.cache[str] = true;
        return str;
      },

      /**
       * Pick a random character from the string
       */
      randomFrom: function (str) {
        // ~~ acts as a floor for positive numbers
        return str[~~(Math.random() * str.length)];
      }

    };

    return uid;
  });


}());