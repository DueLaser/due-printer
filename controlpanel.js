/**
 * The controller for the control panel.
 */
app.controller('controlPanelCtrl', function($scope, $timeout,
    hotkeys, settingsService, machineService, fileService) {
  $scope.emergencyStop = machineService.emergencyStop;
  $scope.settings = settingsService.settings;
  $scope.machineService = machineService;
  $scope.logs = machineService.logs.slice();
  $scope.fileService = fileService;

  $scope.stepSize = 1;
  $scope.laserligado=false;
  $scope.ciclo_pausado=false;
  $scope.cortando=false;


  // Rendering takes a lot of time, so only update the logs from the source of
  // truth every once in a while.
  var debounce = null;
  $scope.$watch(
    function() {return machineService.logs;},
    function(newValue, oldValue) {
      if (!debounce) {
        debounce = $timeout(function() {
          // Set the logs that we render to a _copy_ of the current logs.
          $scope.logs = newValue.slice();
          debounce = null;
        }, 200);
      }
    }, true);

  hotkeys.bindTo($scope)
    .add({
      combo: ['up', 'i'],
      description: 'move the Y axis in the + direction',
      callback: function() {$scope.relativeMove("Y")}
    })
    .add({
      combo: ['down' ,'k'],
      description: 'move the Y axis in the - direction',
      callback: function() {$scope.relativeMove("Y-")}
    })
    .add({
      combo: ['left', 'j'],
      description: 'move the X axis in the - direction',
      callback: function() {$scope.relativeMove("X-")}
    })
    .add({
      combo: ['right', 'l'],
      description: 'move the X axis in the + direction',
      callback: function() {$scope.relativeMove("X")}
    })
    .add({
      combo: ['a'],
      description: 'move the Z axis in the + direction',
      callback: function() {$scope.relativeMove("Z")}
    })
    .add({
      combo: ['z'],
      description: 'move the Z axis in the - direction',
      callback: function() {$scope.relativeMove("Z-")}
    })
    .add({
      combo: '-',
      description: 'decrement the step size',
      callback: function() {$scope.incrementStepSize(-1)}
    })
    .add({
      combo: '=',
      description: 'increment the step size',
      callback: function() {$scope.incrementStepSize(1)}
    })
    .add({
      combo: '/',
      description: 'focus the manual command entry',
      callback: function() {
        // Let the event finish propagating.
        $timeout(function() {
          $("#input-control-cmd").focus();
        }, 1);
      }
    });

  // The manual input field has to be configured manually.
  // The history of manual commands that the user has entered.
  var manualInputHistory = [];
  var manualInputPosition = 0;


$scope.mostraAjuda = function(texto) {
    var ajuda = document.getElementById("ajuda");
    ajuda.innerHTML="<strong>"+texto+"</strong>";
    $("#ajuda").removeClass("hidden");
};

$scope.escondeAjuda = function () {
    var ajuda = document.getElementById("ajuda");
    $("#ajuda").addClass("hidden");
    ajuda.innerHTML="";
};


  $scope.manualCommand = "";
  $scope.sendManualCommand = function(command) {
    manualInputHistory.push(command);
    manualInputPosition = manualInputHistory.length;
    machineService.enqueueCommands([command + '\n']);
    $scope.manualCommand = "";
  }

  $("#input-control-cmd").keydown(function(e) {
    e.stopPropagation();

    if (e.keyCode == 27) { // escape; blur the manual command input.
      // the delay is to allow the current event propagation to finish.
      $timeout(function() {
        $("#input-control-cmd").blur();
      }, 1);

    } else if (e.keyCode == 38) { // up arrow; show previous history position.
      manualInputPosition = Math.max(manualInputPosition - 1, 0);
      var prevCommand = ((manualInputPosition < manualInputHistory.length) ?
          manualInputHistory[manualInputPosition] : "");
      $scope.manualCommand = prevCommand;
      $timeout(function() {
        $("#input-control-cmd")[0].setSelectionRange(prevCommand.length, prevCommand.length);
      }, 1);
    } else if (e.keyCode == 40) { // down arrow; show next history position.
      manualInputPosition = Math.min(manualInputPosition + 1, manualInputHistory.length);
      var nextCommand = ((manualInputPosition < manualInputHistory.length) ?
          manualInputHistory[manualInputPosition] : "");
      $scope.manualCommand = nextCommand;
      $timeout(function() {
        $("#input-control-cmd")[0].setSelectionRange(nextCommand.length, nextCommand.length);
      }, 1);
    }
  });

  var shouldSendCommands = function() {
    return machineService.isConnected && machineService.commandQueue.length == 0;
  }

   $scope.getStepSize = function() {
    return Math.pow(10, $scope.stepSize);
  }


  $scope.incrementStepSize = function(amt) {
    $scope.stepSize = Math.max(-1, Math.min(2, $scope.stepSize + amt));
  }

  /**
   * Enqueue a command to perform a relative move. The global step size
   * will be used.
   *
   * @param {string} axis The axis to move about (eg. 'X-')
   */
  $scope.relativeMove = function(axis) {
    if (!shouldSendCommands()) {
      return;
    }

    var commands = [];
    if (!machineService.isRelativeMode) {
      commands.push("G91\n");
    }
    if (!machineService.isMm) {
      commands.push("G21\n");
    }

    var feedrate = settingsService.settings.workspace_jog_feedrate;
    var mv = "G1";
    if (settingsService.settings.workspace_jog_rapid) {
      mv = "G0"
    } else if (feedrate != NaN && feedrate > 0) {
      mv += " F" + feedrate;
    }
    mv += " " + axis + $scope.getStepSize();
    commands.push(mv + '\n');

    machineService.enqueueCommands(commands);
  };

  $scope.sendCommands = function(cmds) {
    if (!shouldSendCommands()) {
      return;
    }
    machineService.enqueueCommands(cmds);
  }

  $scope.ligaLaser = function() {
    console.log("liga laser");
    $scope.laserligado=true;
    machineService.sendCommandToSerialConnection('M3 S15\n');
   }

    $scope.desligaLaser = function() {
    console.log("desliga laser");
    $scope.laserligado=false;
    machineService.sendCommandToSerialConnection('M05\n');
   }

   
    $scope.pausarExecucao = function() {
    console.log("pausa ciclo");
    $scope.ciclo_pausado=true;
    machineService.sendCommandToSerialConnection('M05\n');
    machineService.sendCommandToSerialConnection('!\n');
   }

   $scope.envia_homming = function(){
    machineService.homming();
  }

  $scope.retornaExecucao = function() {
      console.log("despausa ciclo");
      $scope.ciclo_pausado=false;
      //$scope.sendCommands(['~\n']);
      machineService.sendCommandToSerialConnection('~\n');
   }

 var resizeView = function() {
    var minX = -0.01;
    var minY = -0.01;
    var maxX = 0.01;
    var maxY = 0.01;
    var allItems = paper.project.getItems();
    for (var k = 0; k < allItems.length; k++) {
      var bounds = allItems[k].getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
    paper.view.setCenter(new paper.Point(
      minX + (maxX - minX) / 2, minY + (maxY - minY) / 2));

    var scaleX = (paper.view.viewSize.width / ((maxX - minX) * 1.1));
    var scaleY = (paper.view.viewSize.height / ((maxY - minY) *1.1));
    paper.view.setZoom(Math.min(scaleX, scaleY));
  }

  // Set the size of the paper canvas.
  var setSize = function(bounds) {
    paper.view.viewSize = [bounds.width, bounds.height];
    resizeView();
  }

    /* Render the list of gcode commands onto a canvas. */
  var renderGcode = function(commandSequence) {
    console.time("renderGcode");
    // Run an analysis on the gcode to determine the appropriate bounds for rendering.
    var analysis = analyzeGcode(commandSequence);

    // Display the estimated execution time.
    var timeMs = analysis.estimatedExecutionTimeMin * 60 * 1000;
    var duration = moment.duration(timeMs);
    var timeStr = [];
    if (duration.hours() > 0) {
      timeStr.push(duration.hours() + (duration.hours() > 1 ? " horas" : " horas"));
    }
    if (duration.minutes() > 0) {
      timeStr.push(duration.minutes() + (duration.minutes() > 1 ? " minutos" : " minutos"));
    }
    timeStr.push(duration.seconds() + (duration.seconds() > 1 ? " segundos" : " segundo"));
    console.log("estimated execution time: " + timeStr.join(", "));
    $("#info-render").text("Tempo estimado de execução: " + timeStr.join(", "));

    // Clear out any previous paths.
    paper.project.clear();

    // Initialize our state variables.
    var settings = settingsService.settings;
    var warnings = {};

    // A scaling factor from current units to mm.
    var scale = 1;

    // A toggle for absolute v. relative coordinate specification.
    var isRelative = false;

    // A toggle for inch v. millimeter coordinate specification.
    var isInches = false;

    // The current tool position.
    var pos = {
      "X": 0,
      "Y": 0,
      "Z": 0
    };

    // A paper group for all of the paths to be rendered.
    var allPaths = new paper.Group();

    // Draw a little graph table representing out workspace.
    var workspaceWidth = parseFloat(settings["workspace-width-mm"]) || 100;
    var workspaceDepth = parseFloat(settings["workspace-depth-mm"]) || 100;
    allPaths.addChild(new paper.Path.Line({
      "from": [0, 0],
      "to": [0, workspaceWidth],
      "strokeColor": "#A3CCCC",
      "strokeWidth": 2
    }));
    allPaths.addChild(new paper.Path.Line({
      "from": [0, 0],
      "to": [workspaceDepth, 0],
      "strokeColor": "#A3CCCC",
      "strokeWidth": 2
    }));
    for (var ix = 10; i < workspaceWidth; ix += 10) {
      allPaths.addChild(new paper.Path.Line({
        "from": [ix, 0],
        "to": [ix, workspaceDepth],
        "strokeColor": "#CCFFFF"
      }));
    }
    for (var iy = 10; i < workspaceDepth; iy += 10) {
      allPaths.addChild(new paper.Path.Line({
        "from": [0, iy],
        "to": [workspaceWidth, iy],
        "strokeColor": "#CCFFFF"
      }));
    }

    console.time("renderGcode: Processando gcode");
    var path = null;
    var prevInstruction = "";
    for (var i = 0; i < commandSequence.length; i++) {
      var command = prevInstruction + commandSequence[i];
      var parts = breakupGcodeCommand(command);

      var cType = parts[0][0];
      var cNum = parseInt(parts[0].substr(1), 10);

      // The carriage return can pass new arguments to the previous command.
      prevInstruction = command.endsWith('\r') ? cType + cNum + " " : "";

      // Read the command parameters.
      var params = {};
      for (var j = 1; j < parts.length; j++) {
        params[parts[j][0].toUpperCase()] = parseFloat(parts[j].substr(1)) || 0;
      }

      if (!(cType == "G" && (cNum == 1 || cNum == 2 || cNum == 3))) {
        path = null;
      }

      if (cType == "G" && (cNum === 0 || cNum === 1)) {
        var endX = ((isRelative || params.X === undefined) ? pos.X : 0) +
            ((params.X === undefined) ? 0 : params.X * scale);
        var endY = ((isRelative || params.Y === undefined) ? pos.Y : 0) +
            ((params.Y === undefined) ? 0 : params.Y * scale);

        // rapid move | linear interpolation
        var start = new paper.Point(pos.X, pos.Y);
        var end = new paper.Point(endX, endY);

        // create a new path if one is not already available.
        if (!path) {
          path = new paper.Path();
          allPaths.addChild(path);
          path.strokeColor = 'black';
          if (cNum === 0) {
            path.dashArray = [1, 2];
          }
          path.moveTo(new paper.Point(start.x, start.y));
        }

        path.lineTo(new paper.Point(end.x, end.y));

        // Update our known position.
        pos.X = end.x;
        pos.Y = end.y;

        // Don't join rapid move segments since they have a different style than other lines.
        if (cNum === 0) {
          path = null;
        }
      } else if (cType == "G" && (cNum === 2 || cNum === 3)) {
        if (params.I === undefined || params.J === undefined) {
          msg = "Especifique os parametros I e J: " + command;
          warnings[msg] = (warnings[msg] || 0) + 1;
          continue;
        }

        // circular interpolation (clockwise)
        var clockwise = (cNum == 2);

        var arcEndX = ((isRelative || params.X === undefined) ? pos.X : 0) +
            ((params.X === undefined) ? 0 : params.X * scale);
        var arcEndY = ((isRelative || params.Y === undefined) ? pos.Y : 0) +
            ((params.Y === undefined) ? 0 : params.Y * scale);

        // TODO: implement missing axii (Z, A, B, C, K)
        var arcStart = new paper.Point(pos.X, pos.Y);
        var arcEnd = new paper.Point(arcEndX, arcEndY);

        var center = arcStart.add(new paper.Point(params.I * scale, params.J * scale));
        var through = arcStart.subtract(center);
        through.angle = arcStart.add(arcEnd).subtract(center).subtract(center).angle;
        through = through.add(center);

        if (!path) {
          path = new paper.Path();
          allPaths.addChild(path);
          path.strokeColor = 'black';
          path.moveTo(new paper.Point(arcStart.x, arcStart.y));
        }
        path.arcTo(
          new paper.Point(through.x, through.y),
          new paper.Point(arcEnd.x, arcEnd.y));

        // Update our known position.
        pos.X = arcEnd.x;
        pos.Y = arcEnd.y;
      } else if (cType == "G" && cNum === 4) {
        // dwell
      } else if (cType == "G" && cNum === 9) {
        // exact stop, non-modal
      } else if (cType == "G" && cNum === 17) {
        // XY plane selection
        // TODO: support other axis specification
      } else if (cType == "G" && cNum === 20) {
        // programming in inches
        scale = 25.4;
        isInches = true;
      } else if (cType == "G" && cNum === 21) {
        // programming in mm
        scale = 1;
        isInches = false;
      } else if (cType == "G" && cNum === 28) {
        // return to home
        if (params.X !== undefined) {
          pos.X = 0;
        }
        if (params.Y !== undefined) {
          pos.Y = 0;
        }
        if (params.Z !== undefined) {
          pos.Z = 0;
        }
      } else if (cType == "G" && cNum === 40) {
        // tool radius compensation off.
        // TODO: implement tool radius compensation.
      } else if (cType == "G" && cNum === 61) {
        // exact stop, modal
      } else if (cType == "G" && cNum === 64) {
        // cancel exact stop, modal
      } else if (cType == "G" && cNum === 90) {
        // absolute coordinates.
        isRelative = false;
      } else if (cType == "G" && cNum === 91) {
        // relative coordinates.
        isRelative = true;
      } else if (cType == "G" && cNum === 92) {
        // coordinate system offset. This command effectively states that the machine
        // is at the specified coordinates.

        // Fake support for this by validating that the command does not mess
        // with an axis we care about.
        // TODO: implement real support for this.
        if (params.X !== undefined ||
            params.Y !== undefined ||
            params.Z !== undefined) {
          msg = "Off set nao implentado (G92)";
          warnings[msg] = (warnings[msg] || 0) + 1;
        }
      }else if (cType == "M" && cNum === 18) {
        commandSequence.splice(i,1);
      }

      else if (cType == "M") {
        // Most M codes can safely be ignored.

        switch(cNum) {
        case 0: // compulsory stop
        case 1: // optional stop
        case 2: // end of program
        case 3: // spindle on clockwise
        case 4: // spindle on counterclockwise
        case 5: // spindle stop
        case 6: // tool change for linuxcnc
        case 7: // coolant on, mist
        case 8: // coolant on, flood
        case 9: // coolant off
        //case 18:  
        case 30: // end of program with return to top
        case 40: // reprap eject
        case 82: // reprap extruder absolute mode
        case 83: // reprap extruder relative mode
        case 84: // reprap stop idle hold
        case 104: // reprap set extruder temperature
        case 105: // reprap get extruder temperature
        case 106: // reprap fan on
        case 107: // reprap fan off
        case 108: // reprap set extruder speed
        case 109: // reprap set extruder temperature and wait
        case 140: // reprap set bed temperature (fast)
        case 141: // reprap set chamber temperature (fast)
        case 143: // reprap set maximum hot-end temperature
        case 190: // reprap wait for bed temperature to reach target
        continue;
        default:
          msg = "Comando gcode não implementado: " + parts[0];
          warnings[msg] = (warnings[msg] || 0) + 1;
        }
      } else {
        msg = "Comando gcode Desconhecido: " + parts[0];
        warnings[msg] = (warnings[msg] || 0) + 1;
      }
    }
    console.timeEnd("renderGcode: procesando GCODE");

    // Invert everything (to move the origin to the bottom left).
    allPaths.scale(1, -1);

    // The view must be resized before setting the stroke width
    // so we know how wide to stroke.
    resizeView();
    allPaths.style.strokeWidth = 1 / paper.view.getZoom();

    paper.view.draw();

    // Log all warnings.
    $("#warnings-render").html("");
    $("#warnings-render").hide();
    for (var w in warnings) {
      console.log(w);
      $("<div>", {"text": w}).appendTo("#warnings-render");
    }
    if (Object.keys(warnings).length > 0) {
      $("#warnings-render").show();
    }

    console.timeEnd("renderGcode");
  }

  $scope.$on('fileUpdated', function() {
    renderGcode(fileService.commandSequence);
  });

  $scope.sendFileToMachine = function() {
    if (!machineService.isConnected) {
      console.log("machine not connected. cannot send file.");
      return;
    }
    console.log("enqueing file command sequence.");

    machineService.sendCommandToSerialConnection("$H\n", true);


    if (settingsService.settings.gcode_preamble) {
      machineService.enqueueCommands(
        extractCommandSequence(settingsService.settings.gcode_preamble));
    }

    machineService.enqueueCommands(fileService.commandSequence);

    if (settingsService.settings.gcode_postamble) {
      machineService.enqueueCommands(
          extractCommandSequence(settingsService.settings.gcode_postamble));
    }

    $state.go("controlpanel");
  }

  // Initialize paper.js
  paper.setup($("#render-canvas")[0]);

  // Render an empty workspace.
  renderGcode(fileService.commandSequence);

  // Setup the drag-and-drop listeners.
  $("#render-canvas-holder")[0].addEventListener('drop', fileService.handleFileSelect, false);


  // Update the size of various elements to fill the screen.
  var resize = function() {
    var anchor = document.getElementById("bottom-tracker-renderer");
    var elem = document.getElementById("render-canvas");
    elem.style.setProperty("height", (anchor.getBoundingClientRect().top/1.65 -
        elem.getBoundingClientRect().top/1.65) + "px");
    setSize(elem.getBoundingClientRect());
  };
  $scope.$on('resize', resize);
  resize();
});
