'use strict';
angular.element(document.body).append('<div ng-app="myApp" ng-controller="YomiController" observe-keys></div>');
var app = angular.module('myApp', []);
app.controller('YomiController', ['$scope','$http', function($scope,$http) {
    $scope.refreshPopup = function(content) {
        const doc = $scope.popup.contentDocument;
        console.log(content);
        var html = content.body.replace(/qrc:\/\/\/img\/img/g,chrome.extension.getURL("images"))
        doc.open();
        doc.write("<div id='yomisama'>" + html + "</div>");
        doc.close();
        $scope.popup.contentDocument.getElementById('yomisama').addEventListener('mousewheel', function(e) {
            console.log(e);
            var d = e.wheelDelta;
            var jq = $($scope.popup);
            console.log([this.scrollHeight, jq.height(),d,this.scrollTop]);
            if((jq.scrollTop === (this.scrollHeight - jq.height()) && d < 0) || (jq.scrollTop === 0 && d > 0)) {
                e.preventDefault();
            }
        });
        var $head = $($scope.popup).contents().find("head");
        $head.append($("<link/>",
            { rel: "stylesheet", href: chrome.extension.getURL("styles/main.css"), type: "text/css" }));
        var a = $($scope.popup).contents().find("a")
            .click(function(e) {
                var href = $(e.currentTarget).attr('href');
                console.log("click: ",href);
                chrome.runtime.sendMessage({
                    action: "link",
                    params: {
                        profile: 'vocabulary',
                        href: href
                    }
                },function(response) {
                    $scope.refreshPopup(response["vocabulary"]);
                });
                e.preventDefault();
            });

    };
    $scope.onLookup = function(rp,ro,mm) {
        var d = {
            samplePosStart: ro,
            content: rp,
            contentSampleFlat: rp.slice(ro),
            contentSample: rp.slice(ro)
        }
        chrome.runtime.sendMessage({
            action: "lookup",
            params: d
        },function(response) {
            $scope.popup.style.left = mm.clientX + 'px';
            $scope.popup.style.top = (mm.clientY+20) + 'px';
            $scope.popup.style.visibility = 'visible';
            $scope.refreshPopup(response["vocabulary"]);
        });
    };

    $scope.overPopup = function(x,y) {
        const rect = $scope.popup.getBoundingClientRect();
        return x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom;
    }

    $scope.hidePopup = function() {
        $scope.popup.style.visibility = 'hidden';
    }

    $scope.popup = document.createElement('iframe');
    $scope.popup.id = 'yomisama-popup';
    $scope.popup.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    $scope.popup.addEventListener('scroll', function(e) { e.stopPropagation(); });

    document.body.appendChild($scope.popup);
}]);
app.directive('observeKeys', [
    '$document',
    '$rootScope',
    function($document, $rootScope) {
        return {
            restrict: 'A',
            link: function(scope,element,attrs) {
                $document.bind('scroll', function(e) {
                   scope.hidePopup();
                });
                $document.bind('resize', function(e) {
                    scope.hidePopup();
                });
                $document.bind('mousedown', function(e) {
                    if(!scope.overPopup(e.clientX,e.clientY)) {
                        scope.hidePopup();
                    }
                });
                $document.bind('mousemove', function(e) {
                    //console.log("mousemove:",e);
                    $rootScope.mouseMove = e;
                });
                $document.bind('keypress', function(e) {
                    if(e.which == 17 && e.ctrlKey) {
                        var range = document.caretRangeFromPoint($rootScope.mouseMove.clientX, $rootScope.mouseMove.clientY);
                        var rp = range.startContainer;
                        var ro = range.startOffset;
                        scope.onLookup(rp.textContent,ro,$rootScope.mouseMove);
                    }
                    $rootScope.$broadcast('keypress', e);
                    $rootScope.$broadcast('keypress:' + e.which, e);
                });
            }
        };
    }
]);