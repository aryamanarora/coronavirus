var width = 1000;
var height = 1000;

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height)

var projection = d3.geoAlbersUsa()

var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

var path = d3.geoPath()
    .projection(projection)

var color = d3.scaleLog([1, 1000000], ["white", "red"])

var legend = svg.selectAll("g.legend")
    .data([1, 10, 100, 1000, 10000, 100000])
    .enter()
    .append("g")
    .attr("class", "legend");

var ls_w = 73, ls_h = 20;
		 
legend.append("rect")
    .attr("x", function(d, i){ return width - (i*ls_w) - ls_w;})
    .attr("y", 550)
    .attr("width", ls_w)
    .attr("height", ls_h)
    .style("fill", function(d, i) { return color(d); })
    .style("opacity", 0.8);

labels = ["1", "10", "100", "1000", "10000", "100000"]
legend.append("text")
    .attr("x", function(d, i){ return width - (i*ls_w) - ls_w;})
    .attr("y", 590)
    .text(function(d, i){ return labels[i]; });

var legend_title = "Number of coronavirus cases";

svg.append("text")
    .attr("x", 10)
    .attr("y", 540)
    .attr("class", "legend_title")
    .text(function(){return legend_title});

function load(us, data) {
    data = new Map(data)

    new_york = [36081, 36005, 36047, 36085]
    new_york.forEach(d => {
        data.set(d, data.get(36061))
    });
    
    svg.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "county")
        .attr("id", function (d) { return "id " + d.id })
        .style("fill", function (d) {
            if (data.get(d.id)) {
                return color(data.get(d.id).count || 1)
            }
            return color(1)
        })
        .on("mouseover", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 1);
			tooltip.html(
			"<p><strong>" + data.get(d.id).name + "</strong>: " + data.get(d.id).count + "</p>")
			.style("left", (d3.event.pageX + 15) + "px")
			.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 0);
		});
}

d3.json("us.json").then(function(us) {
    d3.csv("data.csv", function(d) {
        return [+d.FIPS, {'count': +d["4/8/20"], 'name': d["Combined_Key"]}]
    }).then(function(data) {
        load(us, data)
    })
})