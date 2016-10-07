(function (angular) {
    "use strict";

    var app = angular.module('myApp.dashboard', ['ngRoute', 'firebase.utils', 'firebase']);

    app.controller('DashboardCtrl', function ($scope, $q, $firebaseObject) {

        /*

        Format stuff - mostly overriding bootstrap

        */

        // override navbar styles
        function overrideNavBar(){
            var navBar = d3.select('.navbar-light')
            navBar.style({

                'position': 'absolute',
                'left': '0px',
                'top': '0px',

                'width': '100%',
                'background-color': 'rgba(43, 78, 71, 1)',
                'font-family': 'Roboto Condensed, Helvetica',
                'font-weight': 600

            });

            navBar.selectAll('a')
                .style({ 'color': 'rgba(128,128,128,1)' })
                .on('mouseover', function(d,i){
                    d3.select(this).style({ 'color': 'rgba(1,1,1,1)' })
                })
                .on('mouseout', function(d,i){
                    d3.select(this).style({ 'color': 'rgba(128,128,128,1)' })
                });

            d3.selectAll('.navbar-brand')
                .style({
                    'font-size': '1.6em'
                });
        }

        overrideNavBar()

        d3.sankey = function () {
            var sankey = {},
                nodeWidth = 24,
                nodePadding = 8,
                size = [1, 1],
                nodes = [],
                links = [];

            sankey.nodeWidth = function (_) {
                if (!arguments.length) return nodeWidth;
                nodeWidth = +_;
                return sankey;
            };

            sankey.nodePadding = function (_) {
                if (!arguments.length) return nodePadding;
                nodePadding = +_;
                return sankey;
            };

            sankey.nodes = function (_) {
                if (!arguments.length) return nodes;
                nodes = _;
                return sankey;
            };

            sankey.links = function (_) {
                if (!arguments.length) return links;
                links = _;
                return sankey;
            };

            sankey.size = function (_) {
                if (!arguments.length) return size;
                size = _;
                return sankey;
            };

            sankey.layout = function (iterations) {
                computeNodeLinks();
                computeNodeValues();
                computeNodeBreadths();
                computeNodeDepths(iterations);
                computeLinkDepths();
                return sankey;
            };

            sankey.relayout = function () {
                computeLinkDepths();
                return sankey;
            };

            sankey.link = function () {
                var curvature = .5;

                function link(d) {
                    var x0 = d.source.x + d.source.dx,
                        x1 = d.target.x,
                        xi = d3.interpolateNumber(x0, x1),
                        x2 = xi(curvature),
                        x3 = xi(1 - curvature),
                        y0 = d.source.y + d.sy + d.dy / 2,
                        y1 = d.target.y + d.ty + d.dy / 2;
                    return "M" + x0 + "," + y0
                        + "C" + x2 + "," + y0
                        + " " + x3 + "," + y1
                        + " " + x1 + "," + y1;
                }

                link.curvature = function (_) {
                    if (!arguments.length) return curvature;
                    curvature = +_;
                    return link;
                };

                return link;
            };

            // Populate the sourceLinks and targetLinks for each node.
            // Also, if the source and target are not objects, assume they are indices.
            function computeNodeLinks() {
                nodes.forEach(function (node) {
                    node.sourceLinks = [];
                    node.targetLinks = [];
                });
                links.forEach(function (link) {
                    var source = link.source,
                        target = link.target;
                    if (typeof source === "number") source = link.source = nodes[link.source];
                    if (typeof target === "number") target = link.target = nodes[link.target];
                    source.sourceLinks.push(link);
                    target.targetLinks.push(link);
                });
            }

            // Compute the value (size) of each node by summing the associated links.
            function computeNodeValues() {
                nodes.forEach(function (node) {
                    node.value = Math.max(
                        d3.sum(node.sourceLinks, value),
                        d3.sum(node.targetLinks, value)
                    );
                });
            }

            // Iteratively assign the breadth (x-position) for each node.
            // Nodes are assigned the maximum breadth of incoming neighbors plus one;
            // nodes with no incoming links are assigned breadth zero, while
            // nodes with no outgoing links are assigned the maximum breadth.
            function computeNodeBreadths() {
                var remainingNodes = nodes,
                    nextNodes,
                    x = 0;

                while (remainingNodes.length) {
                    nextNodes = [];
                    remainingNodes.forEach(function (node) {
                        node.x = x;
                        node.dx = nodeWidth;
                        node.sourceLinks.forEach(function (link) {
                            nextNodes.push(link.target);
                        });
                    });
                    remainingNodes = nextNodes;
                    ++x;
                }

                //
                moveSinksRight(x);
                scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
            }

            function moveSourcesRight() {
                nodes.forEach(function (node) {
                    if (!node.targetLinks.length) {
                        node.x = d3.min(node.sourceLinks, function (d) {
                                return d.target.x;
                            }) - 1;
                    }
                });
            }

            function moveSinksRight(x) {
                nodes.forEach(function (node) {
                    if (!node.sourceLinks.length) {
                        node.x = x - 1;
                    }
                });
            }

            function scaleNodeBreadths(kx) {
                nodes.forEach(function (node) {
                    node.x *= kx;
                });
            }

            function computeNodeDepths(iterations) {
                var nodesByBreadth = d3.nest()
                    .key(function (d) {
                        return d.x;
                    })
                    .sortKeys(d3.ascending)
                    .entries(nodes)
                    .map(function (d) {
                        return d.values;
                    });

                //
                initializeNodeDepth();
                resolveCollisions();
                for (var alpha = 1; iterations > 0; --iterations) {
                    relaxRightToLeft(alpha *= .99);
                    resolveCollisions();
                    relaxLeftToRight(alpha);
                    resolveCollisions();
                }

                function initializeNodeDepth() {
                    var ky = d3.min(nodesByBreadth, function (nodes) {
                        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
                    });

                    nodesByBreadth.forEach(function (nodes) {
                        nodes.forEach(function (node, i) {
                            node.y = i;
                            node.dy = node.value * ky;
                        });
                    });

                    links.forEach(function (link) {
                        link.dy = link.value * ky;
                    });
                }

                function relaxLeftToRight(alpha) {
                    nodesByBreadth.forEach(function (nodes, breadth) {
                        nodes.forEach(function (node) {
                            if (node.targetLinks.length) {
                                var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                                node.y += (y - center(node)) * alpha;
                            }
                        });
                    });

                    function weightedSource(link) {
                        return center(link.source) * link.value;
                    }
                }

                function relaxRightToLeft(alpha) {
                    nodesByBreadth.slice().reverse().forEach(function (nodes) {
                        nodes.forEach(function (node) {
                            if (node.sourceLinks.length) {
                                var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                                node.y += (y - center(node)) * alpha;
                            }
                        });
                    });

                    function weightedTarget(link) {
                        return center(link.target) * link.value;
                    }
                }

                function resolveCollisions() {
                    nodesByBreadth.forEach(function (nodes) {
                        var node,
                            dy,
                            y0 = 0,
                            n = nodes.length,
                            i;

                        // Push any overlapping nodes down.
                        nodes.sort(ascendingDepth);
                        for (i = 0; i < n; ++i) {
                            node = nodes[i];
                            dy = y0 - node.y;
                            if (dy > 0) node.y += dy;
                            y0 = node.y + node.dy + nodePadding;
                        }

                        // If the bottommost node goes outside the bounds, push it back up.
                        dy = y0 - nodePadding - size[1];
                        if (dy > 0) {
                            y0 = node.y -= dy;

                            // Push any overlapping nodes back up.
                            for (i = n - 2; i >= 0; --i) {
                                node = nodes[i];
                                dy = node.y + node.dy + nodePadding - y0;
                                if (dy > 0) node.y -= dy;
                                y0 = node.y;
                            }
                        }
                    });
                }

                function ascendingDepth(a, b) {
                    return a.y - b.y;
                }
            }

            function computeLinkDepths() {
                nodes.forEach(function (node) {
                    node.sourceLinks.sort(ascendingTargetDepth);
                    node.targetLinks.sort(ascendingSourceDepth);
                });
                nodes.forEach(function (node) {
                    var sy = 0, ty = 0;
                    node.sourceLinks.forEach(function (link) {
                        link.sy = sy;
                        sy += link.dy;
                    });
                    node.targetLinks.forEach(function (link) {
                        link.ty = ty;
                        ty += link.dy;
                    });
                });

                function ascendingSourceDepth(a, b) {
                    return a.source.y - b.source.y;
                }

                function ascendingTargetDepth(a, b) {
                    return a.target.y - b.target.y;
                }
            }

            function center(node) {
                return node.y + node.dy / 2;
            }

            function value(link) {
                return link.value;
            }

            return sankey;
        };

        var margin = {top: 5.5, right: 0, bottom: 5.5, left: 19.5},
            width = 960 - margin.left - margin.right,
            height = 130 - margin.top - margin.bottom,
            size = height / 7,
            svgPadding = 25,
            svgWidth = d3.max([window.innerWidth,1024]),       // target tablet resolution
            svgHeight = d3.max([window.innerHeight,768]),
            sankeyHeight = svgHeight / 1.8,
            sankeyWidth = svgWidth / 1.6;

        var color = d3.scale.quantize()
            .domain([-.05, .05])
            //.range(d3.range(4));
            .range(d3.range(4).map(function (d) {
                if (d === "ROOT") {
                    return 0;
                }
                if (d === "VEG") {
                    return 1;
                }
                if (d === "FLOWER") {
                    return 2;
                }
                if (d === "TRIM") {
                    return 3;
                }
            }));

        $scope.colors = d3.scale.ordinal().range([
            // 'rgba(31, 119, 180)',
            '#1F77B4',
            //'rgba(174, 199, 232',
            '#AEC7E8',
            //'rgba(255,127,14)',
            '#FF7F0E',
            //'rgba(238, 238, 67)',
            '#EEEE43',
            //'rgba(44, 160, 44)'
            '#2CA02C'
        ]);

        // Helper functions for calendar
        $scope.createDate = function (str) {
            var day = parseInt(str.slice(0, 2));
            var month = parseInt(str.slice(3, 5));
            var year = parseInt(str.slice(6, 10));
            var date = new Date(year, month - 1, day);
            return date;
        }
        $scope.getMax = function (obj) {
            var max = 0;
            angular.forEach(obj, function (value) {
                if (parseInt(value["day"]) > max) {
                    max = parseInt(value["day"]);
                }
            });
            return max;
        }
        $scope.dayExists = function (objArray, day) {
            for (var i = 0; i < objArray.length; i++) {
                if (objArray[i]["day"] == day) return true;
            }
            return false;
        }
        $scope.getDay = function (objArray, day) {
            for (var i = 0; i < objArray.length; i++) {
                if (objArray[i]["day"] == day) return objArray[i]["day"];
            }
        }
        $scope.getTask = function (objArray, day) {
            for (var i = 0; i < objArray.length; i++) {
                if (objArray[i]["day"] == day) return objArray[i]["task"];
            }
        }
        function monthPath(t0) {
            var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                d0 = +day(t0), w0 = +week(t0),
                d1 = +day(t1), w1 = +week(t1);
            return "M" + (w0 + 1) * size + "," + d0 * size
                + "H" + w0 * size + "V" + 7 * size
                + "H" + w1 * size + "V" + (d1 + 1) * size
                + "H" + (w1 + 1) * size + "V" + 0
                + "H" + (w0 + 1) * size + "Z";
        }
        var day = function (d) {
                return (d.getDay() + 6) % 7;
            }, // monday = 0
            week = d3.time.format("%W"), // monday-based week number
            date = d3.time.format("%Y-%m-%d"),
            percent = d3.format("+.1%");

        // Load heatmap heatmap
        function loadObjectHeatMap() {
            var objectHeatMap = [],
                ref = new Firebase("https://viridian-49902.firebaseio.com/calendarEntries"),
                defer = $q.defer();

            ref.on("value", function (snapshot) {

                angular.forEach(snapshot.val(), function (entry) {
                    var date = $scope.createDate(entry["startDate"]);
                    var maxROOT = $scope.getMax(entry["ROOT"]);
                    var maxVEG = $scope.getMax(entry["VEG"]);
                    var maxFLOWER = $scope.getMax(entry["FLOWER"]);
                    var maxTRIM = $scope.getMax(entry["TRIM"]);

                    for (var i = 0; i < maxROOT; i++) {
                        var tempObj = {};
                        tempObj["date"] = new Date(date);
                        tempObj["phase"] = "ROOT"
                        if (entry.hasOwnProperty("ROOT")) {
                            if ($scope.dayExists(entry["ROOT"], i + 1)) {
                                tempObj["hours"] = $scope.getDay(entry["ROOT"], i + 1);
                                tempObj["task"] = $scope.getTask(entry["ROOT"], i + 1);
                            } else {
                                tempObj["hours"] = null;
                                tempObj["task"] = null;
                            }
                        }
                        objectHeatMap.push(tempObj);
                        defer.resolve(objectHeatMap[tempObj]);
                        date.setTime(date.getTime() + (24 * 60 * 60 * 1000));

                    }

                    for (var i = 0; i < maxVEG; i++) {
                        var tempObj = {};
                        tempObj["date"] = new Date(date);
                        tempObj["phase"] = "VEG"
                        if (entry.hasOwnProperty("VEG")) {
                            if (entry.hasOwnProperty("VEG")) {
                                if ($scope.dayExists(entry["VEG"], i + 1)) {
                                    tempObj["hours"] = $scope.getDay(entry["VEG"], i + 1);
                                    tempObj["task"] = $scope.getTask(entry["VEG"], i + 1);
                                } else {
                                    tempObj["hours"] = null;
                                    tempObj["task"] = null;
                                }
                            }
                        }
                        objectHeatMap.push(tempObj);
                        defer.resolve(objectHeatMap[tempObj]);
                        date.setTime(date.getTime() + (24 * 60 * 60 * 1000));
                    }

                    for (var i = 0; i < maxFLOWER; i++) {
                        var tempObj = {};
                        tempObj["date"] = new Date(date);
                        tempObj["phase"] = "FLOWER"
                        if (entry.hasOwnProperty("FLOWER")) {
                            if (entry.hasOwnProperty("FLOWER")) {
                                if ($scope.dayExists(entry["FLOWER"], i + 1)) {
                                    tempObj["hours"] = $scope.getDay(entry["FLOWER"], i + 1);
                                    tempObj["task"] = $scope.getTask(entry["FLOWER"], i + 1);
                                } else {
                                    tempObj["hours"] = null;
                                    tempObj["task"] = null;
                                }
                            }
                        }

                        objectHeatMap.push(tempObj);
                        defer.resolve(objectHeatMap[tempObj]);
                        date.setTime(date.getTime() + (24 * 60 * 60 * 1000));
                    }

                    for (var i = 0; i < maxTRIM; i++) {
                        var tempObj = {};
                        tempObj["date"] = new Date(date);
                        tempObj["phase"] = "TRIM"
                        if (entry.hasOwnProperty("TRIM")) {
                            if (entry.hasOwnProperty("TRIM")) {
                                if ($scope.dayExists(entry["TRIM"], i + 1)) {
                                    tempObj["hours"] = $scope.getDay(entry["TRIM"], i + 1);
                                    tempObj["task"] = $scope.getTask(entry["TRIM"], i + 1);
                                } else {
                                    tempObj["hours"] = null;
                                    tempObj["task"] = null;
                                }
                            }
                        }

                        objectHeatMap.push(tempObj);
                        defer.resolve(objectHeatMap[tempObj]);
                        date.setTime(date.getTime() + (24 * 60 * 60 * 1000));

                    }
                });
                $q.all(objectHeatMap).then(function(returnedObject){
                    $scope.objectHeatMap = returnedObject;
                    console.log($scope.objectHeatMap);

                    var svg = d3.select("body").select("#dashboardSvg").select('svg.heatMap')
                        .data(d3.range(2016, 2017))
                        .enter().append("svg")
                        .attr("class", "heatMap")
                        .style({
                            "position": "relative",
                            "top": function(){return sankeyHeight + "px";},
                            "left": function(){return svgPadding + 'px';}
                        })
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    d3.select('.heatMap')
                        .append('g')
                        .attr({
                            'transform': 'translate(15,55) rotate(270)',
                            'id': 'labelText'
                        })
                        .append("text")
                        .style({
                            'font-size': '2em',
                            'font-weight': '600',
                            'fill': 'rgba(43, 78, 71, 1)'
                        })
                        .text(function (d) {
                            return d;
                        });

                    var rect = svg.selectAll(".day")
                        .data(function (d) {
                            return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1));
                        })
                        .enter().append("rect")
                        .attr("class", "day")
                        .attr("width", size)
                        .attr("height", size)
                        .attr("x", function (d) {
                            return week(d) * size;
                        })
                        .attr("y", function (d) {
                            return day(d) * size;
                        })
                        .datum(date);

                    rect.append("title")
                        .text(function (d) {
                            return d;
                        });

                    svg.selectAll(".month")
                        .data(function (d) {
                            return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1));
                        })
                        .enter().append("path")
                        .attr("class", "month")
                        .attr("d", monthPath);

                    var data = d3.nest()
                        .key(function (d) {
                            var currentDate = new Date(d.date);
                            var day = ('0' + currentDate.getDate()).slice(-2);
                            var month = ('0' + (parseInt(currentDate.getMonth()) + 1)).slice(-2);
                            var year = currentDate.getFullYear();
                            var dateString = year + '-' + month + '-' + day;

                            return dateString;
                        })
                        .sortKeys(d3.ascending)
                        .rollup(function (d) {
                            return {
                                phase: d[0].phase
                            }
                        })
                        .map($scope.objectHeatMap);

                    rect
                        .filter(function (d) {
                            return d in data;
                        })
                        .style('fill', function (d) {
                            var phase = data[d]["phase"];
                            if (phase === "ROOT") {
                                return '#1F77B4';
                            }
                            if (phase === "VEG") {
                                return '#AEC7E8';
                            }
                            if (phase === "FLOWER") {
                                return '#FF7F0E';
                            }
                            if (phase === "TRIM") {
                                return '#EEEE43';
                            }
                        })
                        .select("title")
                        .text(function (d) {
                            return d + ": " + percent(data[d]);
                        });
                })
            });
        };

        loadObjectHeatMap();

        // Invoke sankey layout and append it to the svg
        $scope.sankeyTime = function(nodes){

            var sankeyTime = d3.sankey()
                .nodeWidth(72)
                .nodePadding(10)
                .size([sankeyWidth, sankeyHeight]);

            // infer links from nodes
            var links = [],
                nodesLength = nodes.length;

            for (var i = 0; i < nodesLength - 1; i++){
                links.push({
                    'source': i,
                    'sourceName': nodes[i].phase,
                    'target': i + 1,
                    'targetName': nodes[i+1].phase,
                    'value': nodes[i].value
                })
            };

            sankeyTime
                .nodes(nodes)
                .links(links)
                .layout(32);

            var node = d3.select('#dashboardSvg').selectAll('g.node')
                .data(nodes).enter();

            node.append('g')
                .attr({
                    'class': 'node',
                    'transform': function(d,i){
                        // sankey automatically adjusts to fill up svg - so we adjust heights and y by increment, here 1.6
                        var tallestNode = d3.max(nodes, function(d){return d.dy / 1.6}),
                            yInterpolator = d3.interpolateNumber(0, sankeyHeight - tallestNode),
                            y = 0;
                        if (i <= nodes.length / 2) {
                            y = yInterpolator(i / nodes.length) + (svgPadding);
                        } else {
                            y = yInterpolator((nodes.length - i) / nodes.length) + (svgPadding);
                        }

                        d.x += svgPadding;
                        d.y = y + svgPadding;
                        return 'translate(' + d.x + ', ' + d.y + ')';
                    },
                    'id': function(d){return d.phase;}
                })
                .on('click', function(d,i){
                    d3.select(this).append('foreignObject')
                        .attr({
                            'x': svgPadding / 4,
                            'y': svgPadding * 3,
                            'height': svgPadding * 1.1,
                            'width': function(d){return d.dx;},
                            'id': function(d){return d.phase + 'ForeignObject';}
                        })
                        .append('xhtml:div')
                        .html(function(d){
                            return '<input id=\'' + d.phase + 'Input\'><\/input>';
                        });

                    d3.select(this).selectAll('input')
                        .style({
                            'background-color': 'rgba(0,0,0,0)',
                            'height': svgPadding * 1.05,
                            'font-size': svgPadding,
                            'font-weight': '500',
                            'width': '62px',
                            'border-style': 'none',
                            'padding': '0px 0px 0px 0px',
                            'margin': '0px 0px 0px 0px',
                            '-webkit-appearance': 'none',
                            'border-bottom': '1px solid black',
                        })
                        .on('keydown', function () {

                            if (d3.event.keyCode === 13) {
                                var newValue = document.getElementById(d3.event.srcElement.id).value,
                                    parentGroupElementForThisInput = d3.event.path[3].id; // e.g. the <g> '#ROOT'
                                $scope.setPhase(parentGroupElementForThisInput, newValue);
                                d3.select(this).remove();
                            }

                            if (d3.event.keyCode === 27) {
                                d3.select(this).remove();
                            }

                            if (d3.event.keyCode === 9) {
                                d3.select(this).remove();
                            }

                        })
                        .on('blur', function () {
                            var parentGroup = d3.event.path[3].id; // e.g. the <g> '#ROOT'
                            console.log(parentGroup);

                            if (d3.event.keyCode !== 13 || d3.event.keyCode !== 27 || d3.event.keyCode !== 9){

                                if (!(d3.select('#' + parentGroup + 'ForeignObject').empty())){
                                    d3.selectAll('#' + parentGroup + 'ForeignObject').remove()
                                };

                            }
                        });

                })
                // .call(d3.behavior.drag())
                .append("rect")
                .attr("height", function(d) {
                    var newHeight = d.dy / 1.6; // magic number 1.6 again
                    d.dy = newHeight;
                    return d.dy;
                })
                .attr("width", sankeyTime.nodeWidth())
                .style("fill", function(d,i) {
                    return $scope.colors(i);
                });

            var link = d3.select('#dashboardSvg').selectAll(".link")
                .data(links).enter()
                .append("path")
                .attr("d", function(d){
                    return generateLines(d);
                })
                .attr('class', 'link')
                .style({
                    'fill': function(d,i){return $scope.colors(i);},
                    'fill-opacity': 0.8
                });

            d3.selectAll('.node').append("text")
                .attr({
                    'x': function(d){return 0 - d.dy},
                    'y': 20,
                    'font-family': 'Roboto',
                    'font-size': svgPadding,
                    'fill-opacity': 0.4,
                    'font-weight': 600,
                    'class': 'phaseLabel',
                    'transform': 'rotate(270)'
                })
                .text(function(d) { return d.phase; });

            d3.selectAll('.node').append("text")
                .attr({
                    'x': 35,
                    'y': 15,
                    'dy': 12,
                    'font-family': 'Roboto',
                    'font-size': '3em',
                    'fill-opacity': 0.4,
                    'font-weight': 600,
                    'class': 'phaseValue'
                })
                .text(function(d) { return d.value; });
        };

        // get sankey data
        function getSankeyDataAndRender(){
            var phasesRef = new Firebase("https://viridian-49902.firebaseio.com/phases/"),
                phases = {},
                nodes = [
                    {'phase': 'ROOT', 'value': 0 },
                    {'phase': 'VEG', 'value': 0 },
                    {'phase': 'FLOWER', 'value': 0 },
                    {'phase': 'TAKEDOWN', 'value': 0 },
                    {'phase': 'PROCESSING', 'value': 0 },
                ],
                fbObj = $firebaseObject(phasesRef),
                returnedArr = [];

            fbObj.$loaded().then(function(data){
                console.log(data);

                for (var phaseName in data){
                    for (var i = 0; i < nodes.length; i++){
                        if (phaseName.toString() === nodes[i].phase.toString()){
                            console.log(i + ' value of ' + nodes[i].value + ' for phase ' + nodes[i].phase + ' adding value of ' + data[phaseName]);
                            nodes[i].value = data[phaseName];
                            console.log(nodes[i]);
                        }
                    }
                };

                return nodes;

            }).then(function(returnedArr){

                setTimeout($scope.sankeyTime(returnedArr), 5550);

                return $scope.nodes;
            })
        };

        // from enter on an input field write a new value for a phase in the sankey chart to firebase
        $scope.setPhase = function(phase, value){
            var phasesRef = new Firebase("https://viridian-49902.firebaseio.com/phases/"),
                phaseRef = phasesRef.child(phase),
                i = 0,
                nodesLength = $scope.nodes.length,
                links = [];

            // update the local data
            for (i = 0; i < nodesLength; i++){
                if ($scope.nodes[i].phase === phase){
                    $scope.nodes[i].value = value;
                    $scope.nodes[i].dy = value;
                }
            }

            // join to existing data
            var existingData = d3.selectAll('.node').data($scope.nodes);

            // update rect heights
            existingData.selectAll('rect').transition()
                .attr('height', function(d){
                    return d.dy;
                });

            // generate new links array
            for (var i = 0; i < nodesLength - 1; i++){
                links.push({
                    'source': $scope.nodes[i],
                    'sourceName': $scope.nodes[i].phase,
                    'target': $scope.nodes[i + 1],
                    'targetName': $scope.nodes[i+1].phase,
                    'value': $scope.nodes[i].value
                })
            };
            console.log(links);

            // re-calculate lines
            d3.selectAll('.link').data(links).transition().duration(1000)
                .attr('d', function(d){return generateLines(d)})

            // move the text up
            d3.selectAll('.phaseLabel').transition().duration(1000)
                .attr('x', function(d){return 0 - d.dy;});

            // change the value text
            d3.selectAll('.phaseValue').transition().duration(1000)
                .text(function(d){ return d.value; })

            console.log(phaseRef);
            // phaseRef.child(phase).set(value);

        };

        function generateLines(d){
            var x0 = d.source.x + d.source.dx,                    // top right x of source
                y0 = d.source.y,                                  // top right y of source
                x1 = d.source.x + d.source.dx,                    // bottom right x of source
                y1 = d.source.y + d.source.dy,                    // bottom right y of source
                x2 = d.target.x,                                  // top left x of target
                y2 = d.target.y,                                  // top left y of target
                x3 = d.target.x,                                  // bottom left x of target
                y3 = d.target.y + d.target.dy,                    // bottom left y of target
                interpolateX = d3.interpolateNumber(x0, x2),
                interpolateY = d3.interpolateNumber(y0 + (d.source.height / 2), y2 + (d.target.height / 2)),
                curvature = 0.25,
                x4 = interpolateX(curvature),
                x5 = interpolateX(1 - curvature),
                y4 = interpolateY(curvature),
                y5 = interpolateY(curvature - 1);


            /* jshint ignore:start */
            return "M" + x0 + ',' + y0 + ' '    // move to top left
                + ' C' + x4 + ',' + y0          // declare curve ctrl 1 25% to the right at source y
                + ' ' + x5 + ',' + y2           // curve control point 2 75% right height at target y
                + ' ' + x2 + ',' + y2 + ' '     // end curve at top right
                + ' L' + x2 + ',' + y3 + ' '    // line to bottom right straight down
                + ' C' + x5 + ',' + y3          // declare curve, ctrl 1 25% to left at target bottom
                + ' ' + x4 + ',' + y1           // control point 2 75% left at source bottom
                + ' ' + x0 + ',' + y1           // end curve at bottom left
                + ' Z';                         // close shape
            /* jshint ignore:end */
        }

        // get the svg going
        $scope.dashboardSvg = d3.select('body').append('svg')
            .attr({
                'width': svgWidth,
                'height': svgHeight,
                'id': 'dashboardSvg'
            })
            .style({
                'position': 'absolute',
                'left': '0px',
                'top': '50px'
            });

        d3.select('#dashboardSvg')
            .append('text')
            .attr({
                'x': svgPadding,
                'y': svgPadding + 10,
                'id': 'obviousDashboardLabel'
            })
            .style({
                'font-size': '2.4em',
                'font-family': 'Roboto',
                'font-weight': 600,
                'fill': 'rgba(43, 78, 71, 1)'
            })
            .text('FACILITY STATUS');

        d3.select('#dashboardSvg')
            .append('text')
            .attr({
                'x': svgPadding,
                'y': sankeyHeight - svgPadding
            })
            .style({
                'font-size': '2.4em',
                'font-family': 'Roboto',
                'font-weight': 600,
                'fill': 'rgba(43, 78, 71, 1)'
            })
            .text('CALENDAR');

        getSankeyDataAndRender();

    });

    var ref = new Firebase("https://viridian-49902.firebaseio.com/calendarEntries");

    app.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/dashboard', {
            templateUrl: 'dashboard/dashboard.html',
            controller: 'DashboardCtrl'
        });
    }]);

})
(angular);