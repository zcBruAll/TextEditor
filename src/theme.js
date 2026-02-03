export class Theme {
    static defaultTheme() {
        const theme = new Map();
        
        theme.set("keyword", "rgb(161, 90, 207)");
        theme.set("default", "rgb(255, 255, 255)");
        theme.set("string", "rgb(44, 151, 76)");
        theme.set("comment", "rgb(78, 78, 78)");
        theme.set("literal", "rgb(43, 100, 175)");
        theme.set("identifier", "rgb(134, 37, 134)");
        theme.set("special", "rgb(255, 255, 255)");

        return theme;
    }
}