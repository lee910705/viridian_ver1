/**
 * Created by Jae Joon on 10/2/2016.
 */
$scope.getDay = function(objArray, day){
    for(var i = 0; i < objArray.length; i++){
        if(objArray[i]["day"] == day) return objArray[i]["day"];
    }
}

$scope.showHeatMap = function (json) {
    var margin = { top: 5.5, right: 0, bottom: 5.5, left: 19.5 },
        width = 960 - margin.left - margin.right,
        height = 130 - margin.top - margin.bottom,
        size = height / 7;

    var day = function (d) { return (d.getDay() + 6) % 7; }, // monday = 0
        week = d3.time.format("%W"), // monday-based week number
        date = d3.time.format("%Y-%m-%d"),
        percent = d3.format("+.1%");

    var color = d3.scale.quantize()
        .domain([-.05, .05])
        //.range(d3.range(4));
        .range(d3.range(4).map(function (d) {
            if (d === "ROOT") { return 0; }
            if (d === "VEG") { return 1; }
            if (d === "FLOWER") { return 2; }
            if (d === "TRIM") { return 3; }
        }));

    var svg = d3.select("body").selectAll("svg")
        .data(d3.range(2016, 2017))
        .enter().append("svg")
        .attr("class", "RdYlGn")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + size * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .text(function (d) { return d; });

    var rect = svg.selectAll(".day")
        .data(function (d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", size)
        .attr("height", size)
        .attr("x", function (d) { return week(d) * size; })
        .attr("y", function (d) { return day(d) * size; })
        .datum(date);

    rect.append("title")
        .text(function (d) { return d; });

    svg.selectAll(".month")
        .data(function (d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    //var json = $scope.jsonHeatMap;

    var data = d3.nest()
        .key(function (d) {
            var currentDate = new Date(d.date);
            var day = ('0' + currentDate.getDate()).slice(-2);
            var month = ('0'+(parseInt(currentDate.getMonth())+1)).slice(-2);
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
        .map(json);



    rect.filter(function (d) { return d in data; })
        .style('fill', function (d) {
            var phase = data[d]["phase"];
            if (phase === "ROOT") { return '#ff0000'; }
            if (phase === "VEG") { return '#00994c'; }
            if (phase === "FLOWER") { return '#ffff00'; }
            if (phase === "TRIM") { return '#66b2ff'; }
        })
        .select("title")
        .text(function (d) { return d + ": " + percent(data[d]); });

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
}