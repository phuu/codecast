// ====================================
// ace
// ====================================

angular.module('ace', [])

// ====================================
// directive: ace
// Manages an instance of the ace editor. Use the <ace></ace> element!
// ====================================

.directive('ace', ['$window', '$rootScope', function ($window, $rootScope) {
  return {
    restrict: 'E',
    template: '<div class="ace-editor"></div>',
    scope: {
      onEsc: '&',
      onChange: '&',
      onDragEnter: '&',
      onDragLeave: '&',
      onDrop: '&',
      mode: '=',
      source: '=',
      readOnly: '=',
      hasFocus: '='
    },
    link: function (scope, element, attrs, ngModel) {
      if( !$window.ace ) throw new Error("ace not found.");

      // Setup Ace
      var editor = ace.edit(element.children()[0]);
      editor.setTheme("ace/theme/merbivore");
      editor.getSession().setUseSoftTabs(true);
      editor.getSession().setTabSize(2);
      editor.setShowPrintMargin(false);

      // Listen for some events

      if( attrs.onEsc ) {
        var command = {
          name: "escape",
          bindKey: "Esc",
          exec: function () {
            scope.$apply(function () {
              scope.onEsc();
            });
          }
        };
        editor.commands.addCommand(command);
      }

      if( attrs.hasFocus ) {
        scope.$watch('hasFocus', function (hasFocus) {
          if( hasFocus ) {
            editor.focus();
          }
        });
      }

      if( typeof attrs.readOnly !== "undefined" ) {
        editor.setReadOnly(true);
      }

      if( attrs.onDragEnter ) {
        element.on('dragenter', function (event) {
          scope.$apply(function () {
            scope.onDragEnter({$event: event.originalEvent || event});
          });
        });
      }

      if( attrs.onDragLeave ) {
        element.on('dragleave', function (event) {
          scope.$apply(function () {
            scope.onDragLeave({$event: event.originalEvent || event});
          });
        });

        element.on('drop', function (event) {
          scope.$apply(function () {
            [].forEach.call(event.originalEvent.dataTransfer.files, function (file) {
              var reader = new FileReader();
              reader.onload = function (progress_event) {
                editor.getSession().setValue(progress_event.target.result);
              };
              reader.readAsText(file);
            });

            scope.onDrop({$event: event.originalEvent || event});
          });
        });
      }

      // Angularize

      // Watch 'mode' and update the mode
      scope.$watch('mode', function (newMode) {
        editor.getSession().setMode("ace/mode/" + newMode);
      });

      (function () {
        var updating = false,
            first = true;
        // If a model is set on the element, update its value
        // when Ace reports a change
        editor.getSession().on('change', function () {
          updating = true;
          scope.source = editor.getSession().getValue();
          if( !$rootScope.$$phase ) scope.$apply();
        });
        scope.$watch('source', function(source) {
          if( first ) { return (first = false); }
          if (!updating) { editor.getSession().setValue(source || ''); }
          scope.onChange();
          if( !$rootScope.$$phase ) scope.$apply();
          updating = false;
        });
      }());

    }
  };
}]);