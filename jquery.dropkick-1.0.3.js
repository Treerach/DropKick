/**
 * DropKick
 *
 * Highly customizable <select> lists
 * https://github.com/robdel12/DropKick
 *
 * &copy; 2011 Jamie Lottering <http://github.com/JamieLottering>
 *                        <http://twitter.com/JamieLottering>
 *
 * History:
 * 2013-02: live > on (joeblynch)
 * 2013-06: + trigger "change" at update (so one can detect the change) (joeri210)
 *          + method: "reload" to rebuild the pulldown (when dynamic populated) (joeri210)
 */
/*jslint indent: 2, browser: true, white: true, plusplus: true */
/*jshint indent: 2, browser: true, plusplus: false */
/*globals jQuery */
(function ($, window, document) {
  'use strict';

  var 
    msVersion = navigator.userAgent.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/),
    msie = !!msVersion,
    ie6 = msie && parseFloat(msVersion[1]) < 7,

    // Public methods exposed to $.fn.dropkick()
    methods = {},

    // Cache every <select> element that gets dropkicked
    lists   = [],

    // Convenience keys for keyboard navigation
    keyMap = {
      'left'  : 37,
      'up'    : 38,
      'right' : 39,
      'down'  : 40,
      'enter' : 13,
      'tab'   : 9
    },

    // HTML template for the dropdowns
    dropdownTemplate = [
      '<div class="dk_container" id="dk_container_{{ id }}" tabindex="{{ tabindex }}">',
      '   <a class="dk_toggle">',
      '       <span class="dk_label">{{ label }}</span>',
      '   </a>',
      '   <div class="dk_options">',
      '       <ul class="dk_options_inner">',
      '       </ul>',
      '   </div>',
      '</div>'
    ].join(''),

    // HTML template for dropdown options
    optionTemplate = '<li class="{{ current }}"><a data-dk-dropdown-value="{{ value }}">{{ text }}</a></li>',

    // Some nice default values
    defaults = {
      startSpeed : 1000,  // I recommend a high value here, I feel it makes the changes less noticeable to the user
      theme  : false,
      change : false
    },

    // private
    // Update the <select> value, and the dropdown label
    updateFields = function(option, $dk, reset) {
      var value, label, data, $select;

      value = option.attr('data-dk-dropdown-value');
      label = option.text();
      data  = $dk.data('dropkick');

      $select = data.$select;
      $select.val(value).trigger('change'); // Added to let it act like a normal select

      $dk.find('.dk_label').text(label);

      reset = reset || false;

      if (data.settings.change && !reset) {
        data.settings.change.call($select, value, label);
      }
    },

    // Close a dropdown
    closeDropdown = function($dk) {
      $dk.removeClass('dk_open');
    },

    // Open a dropdown
    openDropdown = function($dk) {
      $dk.find('.dk_options').css({ top : $dk.find('.dk_toggle').outerHeight() - 1 });
      $dk.toggleClass('dk_open');
    },

    setScrollPos = function($dk, anchor) {
      var height = anchor.prevAll('li').outerHeight() * anchor.prevAll('li').length;
      $dk.find('.dk_options_inner').animate({ scrollTop: height + 'px' }, 0);
    },

    // Set the currently selected option
    setCurrent = function($current, $dk) {
      $dk.find('.dk_option_current').removeClass('dk_option_current');
      $current.addClass('dk_option_current');

      setScrollPos($dk, $current);
    },

    handleKeyBoardNav = function(e, $dk) {
      var
        code     = e.keyCode,
        options  = $dk.find('.dk_options'),
        open     = $dk.hasClass('dk_open'),
        current  = $dk.find('.dk_option_current'),
        first    = options.find('li').first(),
        last     = options.find('li').last(),
        next,
        prev
      ;

      switch (code) {
      case keyMap.enter:
        if (open) {
          updateFields(current.find('a'), $dk);
          closeDropdown($dk);
        } else {
          openDropdown($dk);
        }
        e.preventDefault();
        break;

      case keyMap.tab:
        if(open){
          updateFields(current.find('a'), $dk);
          closeDropdown($dk);
        }
        break;

      case keyMap.up:
        prev = current.prev('li');
        if (open) {
          if (prev.length) {
            setCurrent(prev, $dk);
          } else {
            setCurrent(last, $dk);
          }
        } else {
          openDropdown($dk);
        }
        e.preventDefault();
        break;

      case keyMap.down:
        if (open) {
          next = current.next('li').first();
          if (next.length) {
            setCurrent(next, $dk);
          } else {
            setCurrent(first, $dk);
          }
        } else {
          openDropdown($dk);
        }
        e.preventDefault();
        break;

      default:
        break;
      }
    },

    notBlank = function(text) {
      return ($.trim(text).length > 0) ? text : false;
    },

    // Turn the dropdownTemplate into a jQuery object and fill in the variables.
    build = function (tpl, view) {
      var
        // Template for the dropdown
        template  = tpl,
        // Holder of the dropdowns options
        options   = [],
        $dk,
        i,
        l,
        $option,
        current,
        oTemplate
      ;

      template = template.replace('{{ id }}', view.id);
      template = template.replace('{{ label }}', view.label);
      template = template.replace('{{ tabindex }}', view.tabindex);

      if (view.options && view.options.length) {
        for (i = 0, l = view.options.length; i < l; i++) {
          $option   = $(view.options[i]);
          current   = 'dk_option_current';
          oTemplate = optionTemplate;

          oTemplate = oTemplate.replace('{{ value }}', $option.val());
          oTemplate = oTemplate.replace('{{ current }}', (notBlank($option.val()) === view.value) ? current : '');
          oTemplate = oTemplate.replace('{{ text }}', $option.text());

          options[options.length] = oTemplate;
        }
      }

      $dk = $(template);
      $dk.find('.dk_options_inner').html(options.join(''));

      return $dk;
    }
  ;

  // Help prevent flashes of unstyled content
  if (!ie6) {
    document.documentElement.className = document.documentElement.className + ' dk_fouc';
  }

  // Called by using $('foo').dropkick();
  methods.init = function (settings) {
    settings = $.extend({}, defaults, settings);

    return this.each(function () {
      var
        // The current <select> element
        $select = $(this),

        // Store a reference to the originally selected <option> element
        $original = $select.find(':selected').first(),

        // Save all of the <option> elements
        $options = $select.find('option'),

        // We store lots of great stuff using jQuery data
        data = $select.data('dropkick') || {},

        // This gets applied to the 'dk_container' element
        id = $select.attr('id') || $select.attr('name'),

        // This gets updated to be equal to the longest <option> element
        width  = settings.width || $select.outerWidth(),

        // Check if we have a tabindex set or not
        tabindex  = $select.attr('tabindex') || '',

        // The completed dk_container element
        $dk = false,

        theme
      ;

      // Dont do anything if we've already setup dropkick on this element
      if (data.id) {
        return $select;
      }

      data.settings  = settings;
      data.tabindex  = tabindex;
      data.id        = id;
      data.$original = $original;
      data.$select   = $select;
      data.value     = notBlank($select.val()) || notBlank($original.attr('value'));
      data.label     = $original.text();
      data.options   = $options;

      // Build the dropdown HTML
      $dk = build(dropdownTemplate, data);

      // Make the dropdown fixed width if desired
      $dk.find('.dk_toggle').css({
        'width' : width + 'px'
      });

      // Hide the <select> list and place our new one in front of it
      $select.before($dk);

      // Update the reference to $dk
      $dk = $('#dk_container_' + id).fadeIn(settings.startSpeed);

      // Save the current theme
      theme = settings.theme || 'default';
      $dk.addClass('dk_theme_' + theme);
      data.theme = theme;

      // Save the updated $dk reference into our data object
      data.$dk = $dk;

      // Save the dropkick data onto the <select> element
      $select.data('dropkick', data);

      // Do the same for the dropdown, but add a few helpers
      $dk.data('dropkick', data);

      lists[lists.length] = $select;

      // Focus events
      $dk.bind('focus.dropkick', function () {
        $dk.addClass('dk_focus');
      }).bind('blur.dropkick', function () {
        $dk.removeClass('dk_open dk_focus');
      });

      setTimeout(function () {
        $select.hide();
      }, 0);
    });
  };

  // Allows dynamic theme changes
  methods.theme = function (newTheme) {
    var
      $select   = $(this),
      list      = $select.data('dropkick'),
      $dk       = list.$dk,
      oldtheme  = 'dk_theme_' + list.theme
    ;

    $dk.removeClass(oldtheme).addClass('dk_theme_' + newTheme);

    list.theme = newTheme;
  };

  // Reset all <selects and dropdowns in our lists array
  methods.reset = function () {
    var
      i,
      l,
      listData,
      $dk,
      $current
    ;
    for (i = 0, l = lists.length; i < l; i++) {
      listData  = lists[i].data('dropkick');
      $dk       = listData.$dk;
      $current  = $dk.find('li').first();

      $dk.find('.dk_label').text(listData.label);
      $dk.find('.dk_options_inner').animate({ scrollTop: 0 }, 0);

      setCurrent($current, $dk);
      updateFields($current, $dk, true);
    }
  };

  // Reload / rebuild, in case of dynamic updates etc.
  // Credits to Jeremy (http://stackoverflow.com/users/1380047/jeremy-p)
  methods.reload = function () {
    var 
      $select = $(this),
      data = $select.data('dropkick')
    ;
    $select.removeData("dropkick");
    $("#dk_container_"+ data.id).remove();
    $select.dropkick(data.settings);
  };

  // Expose the plugin
  $.fn.dropkick = function (method) {
    if (!ie6) {
      if (methods[method]) {
        return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
      } 
      if (typeof method === 'object' || ! method) {
        return methods.init.apply(this, arguments);
      }
    }
  };

  $(function () {

    // Handle click events on the dropdown toggler
    $(document).on('click', '.dk_toggle', function (e) {
      var $dk  = $(this).parents('.dk_container').first();

      openDropdown($dk);

      if (window.ontouchstart !== undefined) {
        $dk.addClass('dk_touch');
        $dk.find('.dk_options_inner').addClass('scrollable vertical');
      }

      e.preventDefault();
      return false;
    });

    // Handle click events on individual dropdown options
    $(document).on((msie ? 'mousedown' : 'click'), '.dk_options a', function (e) {
      var
        $option = $(this),
        $dk     = $option.parents('.dk_container').first()
      ;

      closeDropdown($dk);
      updateFields($option, $dk);
      setCurrent($option.parent(), $dk);

      e.preventDefault();
      return false;
    });

    // Setup keyboard nav
    $(document).bind('keydown.dk_nav', function (e) {
      var
        // Look for an open dropdown...
        $open    = $('.dk_container.dk_open'),

        // Look for a focused dropdown
        $focused = $('.dk_container.dk_focus'),

        // Will be either $open, $focused, or null
        $dk = null
      ;

      // If we have an open dropdown, key events should get sent to that one
      if ($open.length) {
        $dk = $open;
      } else if ($focused.length && !$open.length) {
        // But if we have no open dropdowns, use the focused dropdown instead
        $dk = $focused;
      }

      if ($dk) {
        handleKeyBoardNav(e, $dk);
      }
    });
    
    // Globally handle a click outside of the dropdown list by closing it.
    $(document).on('click', null, function(e) {
      if($(e.target).closest(".dk_container").length === 0) {
        closeDropdown($('.dk_toggle').parents(".dk_container").first());
      }
    });
  });
}(jQuery, window, document));
