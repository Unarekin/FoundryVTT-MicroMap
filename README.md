[![GitHub License](https://img.shields.io/github/license/Unarekin/FoundryVTT-MicroMap)](https://raw.githubusercontent.com/Unarekin/FoundryVTT-MicroMap/refs/heads/master/LICENSE?token=GHSAT0AAAAAACYQQTQK6ODLNX6QMRS6G7GWZY22EZQ)
![GitHub package.json version](https://img.shields.io/github/package-json/v/Unarekin/FoundryVTT-MicroMap)
![Supported Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FUnarekin%2FFoundryVTT-MicroMap%2Frefs%2Fheads%2Fmain%2Fmodule.json)
![Supported Game Systems](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fsystem%3FnameType%3Dfull%26showVersion%3D1%26style%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FUnarekin%2FFoundryVTT-MicroMap%2Frefs%2Fheads%2Fmain%2Fmodule.json)

![GitHub Downloads (specific asset, latest release)](https://img.shields.io/github/downloads/Unarekin/FoundryVTT-MicroMap/latest/module.zip)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2FMicroMap)](https://forge-vtt.com/bazaar#package=MicroMap)

![image](https://github.com/user-attachments/assets/f4228c60-0d5d-4f41-b093-940f490e388f)


- [MicroMap](#micromap)
  - [At a Glance](#at-a-glance)
  - [Installation](#installation)
  - [Usage Instructions](#usage-instructions)
  - [FAQ](#faq)
- [Support](#support)
- [Attributions \& Acknowledgements](#attributions--acknowledgements)

# MicroMap

MicroMap adds a minimap to your Foundry game.  If you're even here to read this, you undoubtedly already know what a minimap is.

## At a Glance

- Set the map to either an image or a scene -- even one *other* than the active one
- Provide your own overlay image to add a stylish border
- Configure the size, shape, and location of the minimap

![image](https://github.com/user-attachments/assets/5a70e91f-e899-4fc7-9aee-eb921aec0cf3)

![image](https://github.com/user-attachments/assets/ccdb48d2-3ef1-450f-811d-76caf8dcf42c)



## Installation

To install this module, copy and paste the following manifest URL into the module installation window in Foundry:

```
https://github.com/Unarekin/FoundryVTT-MicroMap/releases/latest/download/module.json
```

## Usage Instructions

See the [wiki](https://github.com/Unarekin/FoundryVTT-MicroMap/wiki)

## FAQ

**Q:** Why "MicroMap"<br>
**A:** "MiniMap" was taken.

**Q:** When set to "scene", why does the minimap not show fog of war, lighting, or token vision?<br>
**A:** Rendering the scene view is a manual process, and only implements a subset of what Foundry itself can do.  Things like fog of war, lighting, and vision are easily the most processing intensive and technically complex parts of Foundry's rendering system and I do not currently have any plans to reinvent those particular wheels.

So unless I stumble across some mechanism that *wildly* simplifies those features, I would not expect to see the minimap reflect those particular parts of a scene any time soon.

# Attributions & Acknowledgements

Though the module itself does not include any assets (other than a 1x1 transparent image, but that hardly counts), the logo and examples use assets created by the following:
- [16x16 Compass/WIndRose](https://opengameart.org/content/16x16-compasswindrose) by Deco, released under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) license.
- [RPG GUI Construction Kit vMoon](https://opengameart.org/content/rpg-gui-contstruction-kit-vmoon) by Under the moon, released under the [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) license.
- [3-form RPG Boss: "Harlequin Epicycle"](https://opengameart.org/content/3-form-rpg-boss-harlequin-epicycle) by Redshrike, released under the [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) license.
- [JS Actors - Aeon Warriors Field & Battle Sprites](https://opengameart.org/content/js-actors-aeon-warriors-field-battle-sprites) by JosephSeraph, released under the [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) license.
- The dungeon layout used in the actual minimap insert was generated with [watabou](https://watabou.itch.io/)'s [one-page-dungeon](https://watabou.itch.io/one-page-dungeon) generator

# Support

Do please consider throwing me a few bucks over on [Ko-Fi](https://ko-fi.com/unarekin) if you like what you see and are feeling generous.

<a href='https://ko-fi.com/C0C2156VW2' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
