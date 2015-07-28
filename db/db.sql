--
-- nayar MySQL initialization query file
-- create tables for Layar getPOIs response specification, with test data
-- see: https://www.layar.com/documentation/browser/api/getpois-response/
-- Author: thomasrstorey
--

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `nayar_test`
--

-- --------------------------------------------------------

--
-- Table structure for table `Actions`
--

CREATE TABLE IF NOT EXISTS `Actions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `poiID` varchar(255) CHARACTER SET latin1 NOT NULL,
  `uri` varchar(255) CHARACTER SET latin1 NOT NULL,
  `label` varchar(30) CHARACTER SET latin1 NOT NULL,
  `contentType` varchar(255) CHARACTER SET latin1 DEFAULT 'application/vnd.layar.internal',
  `method` enum('GET','POST') CHARACTER SET latin1 DEFAULT 'GET',
  `params` varchar(255) CHARACTER SET latin1 DEFAULT NULL,
  `activityType` int(2) DEFAULT NULL,
  `autoTriggerOnly` tinyint(1) DEFAULT '0',
  `showActivity` tinyint(1) DEFAULT '1',
  `activityMessage` varchar(255) CHARACTER SET latin1 DEFAULT NULL,
  `autoTrigger` tinyint(1) NOT NULL DEFAULT '0',
  `LayerID` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `poiID` (`poiID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

--
-- Dumping data for table `Actions`
--


-- --------------------------------------------------------

--
-- Table structure for table `Animation`
--

CREATE TABLE IF NOT EXISTS `Animation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event` enum('onCreate','onUpdate','onFocus','onClick','onDelete') NOT NULL,
  `type` enum('scale','translate','rotate') NOT NULL,
  `length` int(11) NOT NULL,
  `delay` int(11) DEFAULT '0',
  `interpolation` enum('linear','accelerateDecelerate','accelerate','decelerate','bounce','cycle','anticipateOvershoot','anticipate','overshoot') DEFAULT 'linear',
  `interpolationParam` decimal(10,2) DEFAULT NULL,
  `persist` tinyint(1) DEFAULT '0',
  `repeat` tinyint(1) DEFAULT '0',
  `from` decimal(10,2) DEFAULT NULL,
  `to` decimal(10,2) DEFAULT NULL,
  `axis_x` decimal(10,2) DEFAULT NULL,
  `axis_y` decimal(10,2) DEFAULT NULL,
  `axis_z` decimal(10,2) DEFAULT NULL,
  `poiID` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10 ;

--
-- Dumping data for table `Animation`
--

-- --------------------------------------------------------

--
-- Table structure for table `Layer`
--

CREATE TABLE IF NOT EXISTS `Layer` (
  `layer` varchar(255) NOT NULL,
  `refreshInterval` int(10) DEFAULT '300',
  `fullRefresh` tinyint(1) DEFAULT '1',
  `showMessage` varchar(255) DEFAULT NULL,
  `poiType` enum("geo","vision") NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `layer` (`layer`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2 ;

--
-- Dumping data for table `Layer`
--


-- --------------------------------------------------------

--
-- Table structure for table `LayerAction`
--

CREATE TABLE IF NOT EXISTS `LayerAction` (
  `layerID` int(11) NOT NULL,
  `label` varchar(30) NOT NULL,
  `uri` varchar(255) NOT NULL,
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `contentType` varchar(255) DEFAULT 'application/vnd.layar.internal',
  `method` enum('GET','POST') DEFAULT 'GET',
  `activityType` int(2) DEFAULT NULL,
  `params` varchar(255) DEFAULT NULL,
  `showActivity` tinyint(1) DEFAULT '1',
  `activityMessage` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `layerID` (`layerID`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

--
-- Dumping data for table `LayerAction`
--


-- --------------------------------------------------------

--
-- Table structure for table `Object`
--

CREATE TABLE IF NOT EXISTS `Object` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contentType` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `size` float(15,5) NOT NULL,
  `previewImage` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=7 ;

--
-- Dumping data for table `Object`
--


-- --------------------------------------------------------

--
-- Table structure for table `Transform`
--

CREATE TABLE IF NOT EXISTS `Transform` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rel` tinyint(1) DEFAULT '0',
  `angle` decimal(5,2) DEFAULT '0.00',
  `rotate_x` decimal(2,1) DEFAULT '0.0',
  `rotate_y` decimal(2,1) DEFAULT '0.0',
  `rotate_z` decimal(2,1) DEFAULT '1.0',
  `translate_x` decimal(5,1) DEFAULT '0.0',
  `translate_y` decimal(5,1) DEFAULT '0.0',
  `translate_z` decimal(5,1) DEFAULT '0.0',
  `scale_x` decimal(12,2) DEFAULT '1.00',
  `scale_y` decimal(12,2) DEFAULT '1.00',
  `scale_z` decimal(12,2) DEFAULT '1.00',
  `scale` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- --------------------------------------------------------

--
-- Table structure for table `Anchor`
--

CREATE TABLE IF NOT EXISTS `Anchor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `referenceImage` varchar(255) DEFAULT NULL,
  `lat` decimal(13, 10) DEFAULT NULL,
  `lon` decimal(13, 10) DEFAULT NULL,
  `alt` decimal(13, 10) DEFAULT NULL,
  `geolocation` enum("user") DEFAULT NULL,
  `poiID` varchar(255) CHARACTER SET latin1 NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;



--
-- Table structure for table `Poi`
--

CREATE TABLE IF NOT EXISTS `Poi` (
  `id` varchar(255) NOT NULL,
  `anchorID` int(11) NOT NULL,
  `objectID` int(11) DEFAULT NULL,
  `title` varchar(150) DEFAULT NULL,
  `description` varchar(150) DEFAULT NULL,
  `footnote` varchar(150) DEFAULT NULL,
  `imageURL` varchar(255) DEFAULT NULL,
  `showSmallBiw` tinyint(1) DEFAULT NULL,
  `showBiwOnClick` tinyint(1) DEFAULT NULL,
  `biwStyle` enum("classic","collapsed") DEFAULT NULL,
  `icon_url` varchar(255) DEFAULT NULL,
  `icon_type` int(11) DEFAULT NULL,
  `inFocus` tinyint(1) DEFAULT NULL,
  `poiType` enum("geo","vision") NOT NULL,
  `transformID` int(11) DEFAULT NULL,
  `layerID` int(11) NOT NULL,
  `animationID` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `anchorID` (`anchorID`),
  KEY `objectID` (`objectID`),
  KEY `transformID` (`transformID`),
  KEY `layerID` (`layerID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Insert test data
-- Comment/replace/remove remainder of this file if you want to use this file to
-- initialize your own database.
--

INSERT INTO `Animation` (`id`, `event`, `type`, `length`, `delay`, `interpolation`, `interpolationParam`, `persist`, `repeat`, `from`, `to`, `axis_x`, `axis_y`, `axis_z`, `poiID`) VALUES
(1, 'onFocus', 'scale', 2000, 3000, 'bounce', '1.00', 0, 1, '0.20', '1.00', '1.00', '1.00', '1.00', 1),
(2, 'onClick', 'rotate', 1000, 0, 'linear', NULL, 1, 1, '0.00', '360.00', '0.00', '0.00', '1.00', 1),
(3, 'onClick', 'translate', 2000, 0, 'accelerateDecelerate', NULL, 1, 0, '0.00', '1.00', '-0.08', '0.08', '0.00', 1),
(4, 'onCreate', 'translate', 3000, 0, 'linear', NULL, 0, 0, '1.00', '0.00', '-0.10', '0.00', '0.00', 1);

INSERT INTO `Layer` (`layer`, `refreshInterval`, `fullRefresh`, `showMessage`, `id`, `poiType`) VALUES
('visiontest', 300, 1, NULL, 1, 'vision');
INSERT INTO `Layer` (`layer`, `refreshInterval`, `fullRefresh`, `showMessage`, `id`, `poiType`) VALUES
('geotest', 300, 1, NULL, 2, 'geo');

INSERT INTO `Object` (`id`, `contentType`, `url`, `size`, `previewImage`) VALUES
(1, 'model/vnd.layar.l3d', 'http://maomao.fixedpoint.nl/temp/layar_l3d/music.l3d', 0.50000, NULL);

INSERT INTO `Anchor` (`id`, `referenceImage`) VALUES
(1, 'menu');
INSERT INTO `Anchor` (`id`, `lat`, `lon`) VALUES
(2, 40.692842, -73.931183);

INSERT INTO `Poi` (`id`, `anchorID`, `objectID`, `transformID`, `layerID`, `animationID`, `poiType`) VALUES
('vision_test', 1, 1, 1, 1, 1, 'vision');

INSERT INTO `Poi` (`id`, `anchorID`, `layerID`, `title`, `description`, `footnote`, `imageURL`, `poiType`) VALUES
('geo_test', 2, 2, "nayartest", "testing nayar", "author: thomasrstorey", "http://trstorey.sysreturn.net/lib/img/bioav.png", "geo");
