/**
 * Created by rdunn on 2017-06-06.
 */

$(document).ready(function () {
    let siteMap = [2, 2, 1]; // number of subsections for each section

    let currentPage = [0, 0];  // current section, subsection

    $('.navigation-btn').click(function () {
        console.debug("Nav btn clicked");
        let id = $(this).index();
        navigate(id, 0);

    });

    $('.sub-nav-bar > span').click(function () {
        console.debug("navigate to subsection");
        let id = $(this).parent().index();
        let subid = $(this).index();

        navigate(id, subid);
    });

    $('a.nav-arw').click(function () {
        console.debug("Clicked navigation arrow");
        let newSecId = currentPage[0];
        let newSubSecId = currentPage[1];

        if ($(this).hasClass('next')) {
            newSubSecId++;
            if (newSubSecId > siteMap[newSecId] - 1) {
                // new subSecID is out-of-bounds for this section, reset subSecId to 0, and try to increment section
                newSubSecId = 0;
                newSecId++;
                if (newSecId > siteMap.length - 1) {
                    newSecId = 0;
                }
            }
        }
        else if ($(this).hasClass('previous')) {
            newSubSecId--;
            if (newSubSecId < 0) {
                // new subSecID is out-of-bounds for this section, set subSecId to highest sub-sec of previous section
                // and try to decrement section
                newSecId--;
                if (newSecId < 0) {
                    newSecId = siteMap.length - 1;
                }

                newSubSecId = siteMap[newSecId] - 1;
            }
        }

        navigate(newSecId, newSubSecId);
     });

    // TODO: goes to the same place for every link right now...
    $('a.link').click(function () {
        console.debug("Clicked link");
        navigate(2);
    });

    $("body").keydown(function (e) {
        if (e.which == 37) { // left
            $("a.nav-arw.previous").trigger("click");
        }
        else if (e.which == 39) { // right
            $("a.nav-arw.next").trigger("click");
        }
    });

    function navigate(id, subid) {
        id = id ? id : 0;  // if no id is given, use 0 as default
        subid = subid ? subid : 0;  // if no subid is given, use 0 as default

        currentPage = [id, subid];

        $('.navigation-btn')
            .removeClass('selected')
            .eq(id)
            .addClass('selected');
        $('.sub-nav-bar')
            .removeClass('selected')
            .eq(id)
            .addClass('selected');

        let $subsecBtns = $('.sub-nav-bar.selected > span');
        if ($subsecBtns.length > 0) {
            /* if there is > 1 subsections, add 'selected' class to the subsection button
             (if there is only 1 subsection, then no subsection button will be shown) */
            console.debug("More than 1 subsection");
            $subsecBtns
                .removeClass('selected')
                .eq(subid)
                .addClass('selected');

        }

        $('.help-section')
            .hide()
            .eq(id)
            .show()
            .find('.sub-sec')
                .hide()
                .eq(subid)
                .show();

    }

    navigate(0, 0);

});